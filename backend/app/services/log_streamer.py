import asyncio
import shlex
import json
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class LogStreamer:
    """
    Manages a single kubectl logs -f subprocess and streams lines to an async callback.
    Supports start, stop, pause, resume, and pod switching.
    """

    def __init__(self):
        self.proc: Optional[asyncio.subprocess.Process] = None
        self.pod = None
        self.namespace = None
        self._paused = False
        self._read_task: Optional[asyncio.Task] = None
        self._line_queue: Optional[asyncio.Queue] = None

    async def start(self, pod: str, namespace: str, send_callback):
        """Start streaming logs for pod/namespace. send_callback receives dicts to send over websocket."""
        await self.stop()

        self.pod = pod
        self.namespace = namespace
        self._paused = False
        self._line_queue = asyncio.Queue()

        cmd = ["kubectl", "logs", "-f", pod, "-n", namespace, "--tail=100"]
        logger.info(f"Starting log stream: {' '.join(cmd)}")

        try:
            self.proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except Exception as e:
            logger.exception("Failed to start kubectl process")
            await send_callback({
                "type": "error",
                "message": f"Failed to start log stream: {str(e)}",
                "timestamp": datetime.utcnow().isoformat() + 'Z',
                "level": "error",
                "pod": pod,
                "namespace": namespace,
            })
            return

        self._read_task = asyncio.create_task(self._read_loop(send_callback))

    async def _read_loop(self, send_callback):
        try:
            assert self.proc
            tasks = []
            if self.proc.stdout:
                tasks.append(asyncio.create_task(self._read_stream(self.proc.stdout, send_callback, False)))
            if self.proc.stderr:
                tasks.append(asyncio.create_task(self._read_stream(self.proc.stderr, send_callback, True)))
            if tasks:
                await asyncio.wait(tasks, return_when=asyncio.ALL_COMPLETED)
        except asyncio.CancelledError:
            logger.debug("Read loop cancelled")
        except Exception:
            logger.exception("Unexpected error in read loop")
        finally:
            await self.stop()

    async def _read_stream(self, stream, send_callback, is_error):
        while True:
            line = await stream.readline()
            if line is None or line == b"":
                break

            text = line.decode(errors='replace').rstrip('\n')
            if self._paused:
                await self._line_queue.put((text, is_error))
                continue

            payload = self._build_payload(text, is_error)
            try:
                await send_callback(payload)
            except Exception:
                logger.exception("Error sending log payload")

        if is_error and self.proc and self.proc.returncode is None:
            await self.proc.wait()

    def _build_payload(self, text: str, is_error: bool = False):
        lowered = text.lower()
        level = 'default'
        if any(k in lowered for k in ['error', 'failed', 'exception', 'crash', 'fatal']):
            level = 'error'
        elif any(k in lowered for k in ['warn', 'timeout', 'backoff']):
            level = 'warning'
        elif any(k in lowered for k in ['started', 'running', 'initialized']):
            level = 'info'
        elif any(k in lowered for k in ['healthy', 'connected', 'completed']):
            level = 'success'
        if is_error:
            level = 'error'

        return {
            "type": "log",
            "pod": self.pod,
            "namespace": self.namespace,
            "message": text,
            "level": level,
            "timestamp": datetime.utcnow().isoformat() + 'Z',
        }

    async def pause(self):
        self._paused = True

    async def resume(self, send_callback):
        self._paused = False
        if self._line_queue:
            while not self._line_queue.empty():
                text, is_error = await self._line_queue.get()
                payload = self._build_payload(text, is_error)
                try:
                    await send_callback(payload)
                except Exception:
                    logger.exception("Error sending buffered log payload")

    async def stop(self):
        try:
            if self._read_task and not self._read_task.done():
                self._read_task.cancel()
                try:
                    await self._read_task
                except Exception:
                    pass
                self._read_task = None
        except Exception:
            logger.exception("Error cancelling read task")

        try:
            if self.proc:
                if self.proc.returncode is None:
                    self.proc.kill()
                    try:
                        await self.proc.wait()
                    except Exception:
                        pass
                self.proc = None
        except Exception:
            logger.exception("Error stopping kubectl process")

    async def change_pod(self, pod: str, namespace: str, send_callback):
        await self.start(pod, namespace, send_callback)

*** End Patch