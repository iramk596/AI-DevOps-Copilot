import asyncio
import logging
import threading
from collections import deque
from datetime import datetime, timezone
from typing import Awaitable, Callable, Deque, Optional

from app.services.kubernetes_service import get_k8s_client

logger = logging.getLogger(__name__)

SendCallback = Callable[[dict], Awaitable[None]]


class LogStreamer:
    """
    Streams Kubernetes pod logs without blocking the FastAPI event loop.

    The Kubernetes Python client's streaming iterator is blocking, so it is run
    in a worker thread and bridged back to asyncio through an asyncio.Queue.
    """

    def __init__(self):
        self.pod: Optional[str] = None
        self.namespace: Optional[str] = None
        self._queue: Optional[asyncio.Queue] = None
        self._worker_task: Optional[asyncio.Task] = None
        self._pump_task: Optional[asyncio.Task] = None
        self._stop_event = threading.Event()
        self._paused = False
        self._buffer: Deque[dict] = deque(maxlen=1000)
        self._response = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    async def start(self, pod: str, namespace: str, send_callback: SendCallback):
        await self.stop()

        self.pod = pod
        self.namespace = namespace or "default"
        self._queue = asyncio.Queue()
        self._stop_event = threading.Event()
        self._paused = False
        self._buffer.clear()
        self._loop = asyncio.get_running_loop()

        logger.info("Starting Kubernetes log stream for %s/%s", self.namespace, pod)

        self._worker_task = asyncio.create_task(
            asyncio.to_thread(self._stream_logs_to_queue)
        )
        self._pump_task = asyncio.create_task(self._pump_queue(send_callback))

    async def change_pod(
        self,
        pod: str,
        namespace: str,
        send_callback: SendCallback,
    ):
        await self.start(pod, namespace, send_callback)

    async def pause(self):
        self._paused = True

    async def resume(self, send_callback: SendCallback):
        self._paused = False
        while self._buffer:
            await send_callback(self._buffer.popleft())

    async def stop(self):
        self._stop_event.set()

        try:
            if self._response and hasattr(self._response, "close"):
                self._response.close()
        except Exception:
            logger.debug("Failed to close Kubernetes log response", exc_info=True)
        finally:
            self._response = None

        current_task = asyncio.current_task()
        for task in (self._pump_task, self._worker_task):
            if task and task is not current_task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        self._pump_task = None
        self._worker_task = None
        self._queue = None
        self._buffer.clear()
        self._loop = None

    async def _pump_queue(self, send_callback: SendCallback):
        try:
            while not self._stop_event.is_set():
                if not self._queue:
                    break

                payload = await self._queue.get()
                if payload is None:
                    break

                if self._paused:
                    self._buffer.append(payload)
                    continue

                await send_callback(payload)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Error while sending Kubernetes log payload")

    def _stream_logs_to_queue(self):
        queue = self._queue
        if queue is None:
            return

        try:
            response = get_k8s_client().read_namespaced_pod_log(
                name=self.pod,
                namespace=self.namespace,
                follow=True,
                tail_lines=100,
                timestamps=False,
                _preload_content=False,
            )
            self._response = response

            for raw_line in response.stream():
                if self._stop_event.is_set():
                    break

                message = raw_line.decode("utf-8", errors="replace").rstrip("\r\n")
                self._put_threadsafe(self._build_payload(message), queue)

        except Exception as exc:
            logger.exception(
                "Kubernetes log stream failed for %s/%s",
                self.namespace,
                self.pod,
            )
            self._put_threadsafe(
                {
                    "type": "error",
                    "level": "ERROR",
                    "message": f"Failed to stream logs: {exc}",
                    "timestamp": self._timestamp(),
                    "pod": self.pod,
                    "namespace": self.namespace,
                },
                queue,
            )
        finally:
            self._put_threadsafe(None, queue)
            self._response = None

    def _put_threadsafe(self, payload, queue: asyncio.Queue):
        try:
            if self._loop and self._loop.is_running():
                self._loop.call_soon_threadsafe(queue.put_nowait, payload)
        except RuntimeError:
            logger.debug("Log stream event loop is closed")

    def _build_payload(self, message: str):
        return {
            "type": "log",
            "level": self._classify(message),
            "message": message,
            "timestamp": self._timestamp(),
            "pod": self.pod,
            "namespace": self.namespace,
        }

    @staticmethod
    def _classify(message: str):
        lowered = message.lower()
        if any(token in lowered for token in ("error", "err", "exception", "fatal", "failed", "failure")):
            return "ERROR"
        if any(token in lowered for token in ("warn", "warning", "timeout", "backoff")):
            return "WARN"
        if any(token in lowered for token in ("debug", "trace", "verbose")):
            return "DEBUG"
        return "INFO"

    @staticmethod
    def _timestamp():
        return datetime.now(timezone.utc).isoformat()
