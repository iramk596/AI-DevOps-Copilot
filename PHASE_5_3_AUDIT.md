# Phase 5.3 Audit - Real-Time Log Streaming

## Scope

Inspected requested files:

- `backend/app/api/websocket_routes.py`
- `backend/app/services/kubernetes_service.py`
- `backend/app/services/websocket_manager.py`
- `frontend/src/services/logSocket.js`
- `frontend/src/components/LiveLogsTerminal.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/AIInsights.jsx`

Additional narrow inspection for endpoint/runtime accuracy:

- `backend/app/api/routes.py`
- `backend/app/services/log_streamer.py`
- `frontend/src/components/LiveLogsViewer.jsx`
- `backend/app/api/pods.py`

No implementation code was modified. This file is the only generated artifact for this audit.

## Existing Implementation

### Backend

`backend/app/api/websocket_routes.py` does not define log streaming routes. It only defines:

- `/ws/cluster`

Log streaming routes exist in `backend/app/api/routes.py`, which is included in `backend/app/main.py` without a prefix:

- `/ws/logs`
- `/ws/logs/{namespace}/{pod_name}`

`/ws/logs` is the command-based route. It accepts JSON commands:

- `START_STREAM`
- `STOP_STREAM`
- `PAUSE_STREAM`
- `RESUME_STREAM`
- `CHANGE_POD`

For `START_STREAM` and `CHANGE_POD`, it imports `LogStreamer` from `backend/app/services/log_streamer.py`.

`backend/app/services/kubernetes_service.py` includes `stream_pod_logs(pod_name, namespace="default")`, which uses the Kubernetes Python client:

- `v1.read_namespaced_pod_log(...)`
- `follow=True`
- `tail_lines=10`
- `_preload_content=False`

This means Kubernetes log streaming exists at the service level.

`backend/app/services/websocket_manager.py` is only used for cluster WebSocket broadcasts. It does not manage log WebSocket connections.

### Frontend

`frontend/src/services/logSocket.js` is a singleton client for `/ws/logs`.

It supports:

- WebSocket auto-connect on module construction.
- Message listeners.
- Status listeners.
- Send queue before connection opens.
- Reconnect with increasing delay up to 30 seconds.
- Command helpers for start, stop, pause, resume, and change pod.

`frontend/src/components/LiveLogsTerminal.jsx` is connected to `logSocket`.

It supports:

- Fetching pods from REST.
- Selecting namespace.
- Selecting pod.
- Starting a stream.
- Stopping a stream.
- Pausing/resuming a stream.
- Changing pod while streaming.
- Auto-scroll.
- Log level coloring/filtering.
- Clear logs.
- Download logs.
- Copy logs.

`frontend/src/pages/Dashboard.jsx` embeds `<LiveLogsTerminal compact />`. It also conditionally opens `LiveLogsViewer` from incident cards.

`frontend/src/pages/AIInsights.jsx` does not embed `LiveLogsTerminal` or any log stream viewer. It only provides copied `kubectl logs` commands.

## Required Questions

1. Whether `/ws/logs` exists.

   Yes. `/ws/logs` exists in `backend/app/api/routes.py`, not in `backend/app/api/websocket_routes.py`.

   There is also `/ws/logs/{namespace}/{pod_name}` in `backend/app/api/routes.py`.

2. Whether Kubernetes log streaming exists.

   Partially. `kubernetes_service.stream_pod_logs()` uses the Kubernetes Python client with `follow=True`.

   The command-based `/ws/logs` route does not use that service. It uses `LogStreamer`, which shells out to `kubectl logs -f`.

3. Whether `logSocket.js` is functional.

   Partially. The client has the right command API and reconnect basics, but current backend/runtime bugs prevent reliable end-to-end streaming.

4. Whether `LiveLogsTerminal` is connected.

   Yes. It imports `logSocket`, subscribes to messages/status, and sends stream commands.

   However, its pod-name mapping is currently incompatible with the `/pods` response it fetches.

5. Whether Start/Stop streaming exists.

   Yes. Frontend buttons call `startStream()` and `stopStream()`. Backend `/ws/logs` handles `START_STREAM` and `STOP_STREAM`.

6. Whether pod selection exists.

   Yes. `LiveLogsTerminal` has a pod selector.

   Bug: it expects pod objects to have `name`, but `/pods` returns `pod` from `kubernetes_service.get_all_pods()`.

7. Whether namespace selection exists.

   Yes. `LiveLogsTerminal` builds namespace options from fetched pod data and has a namespace selector.

8. Whether auto-scroll exists.

   Yes. It scrolls to the bottom when new lines arrive if the user is near the bottom and the stream is not paused.

9. Whether log level detection exists.

   Yes, in `LogStreamer._build_payload()`. It detects `error`, `warning`, `info`, `success`, and `default` from log text and stderr.

   `LiveLogsTerminal` then colors and filters logs by `line.level`.

10. Whether download/copy functionality exists.

   Yes. `LiveLogsTerminal` supports Download and Copy for accumulated logs.

## Missing Functionality

- `AIInsights.jsx` does not contain live log streaming UI or embed `LiveLogsTerminal`.
- The command-based `/ws/logs` route does not use the Kubernetes Python client; it depends on a local `kubectl` executable and configured kube context.
- There is no authentication or authorization for log WebSocket access.
- There is no container selection for multi-container pods.
- There is no previous/current log selection, such as `kubectl logs --previous`.
- There is no tail-line count control.
- There is no server-side log search/filtering.
- There is no explicit WebSocket connection cleanup from `LiveLogsTerminal`; it unsubscribes listeners but leaves the singleton socket open.
- There is no status replay in `logSocket.onStatus()`, so components mounting after connection do not immediately receive the current status.
- There is no tracked reconnect timer cleanup in `logSocket.close()`.
- There is no consistent payload contract shared between direct `/ws/logs/{namespace}/{pod_name}` and command `/ws/logs`.

## Bugs

1. Critical: `backend/app/services/log_streamer.py` contains a trailing `*** End Patch` line.

   This is invalid Python syntax. Because `/ws/logs` imports `LogStreamer` when `START_STREAM` or `CHANGE_POD` is received, starting a log stream will fail until this file is fixed.

2. Critical: `LiveLogsTerminal` expects pod field `name`, but `/pods` returns `pod`.

   `LiveLogsTerminal` fetches `/pods` through `api.get('/pods')`. That route is defined in `backend/app/api/routes.py` and returns `kubernetes_service.get_all_pods()`, whose objects use:

   - `pod`
   - `namespace`
   - `status`
   - `node`
   - `restarts`

   The terminal uses `selectedPod.name`, `item.name`, and option values based on `item.name`. This means automatic start, manual pod selection, and `CHANGE_POD` can send `undefined` instead of a real pod name.

3. Critical: `/ws/logs/{namespace}/{pod_name}` calls `stream_pod_logs()` incorrectly.

   Current call:

   - `stream_pod_logs(namespace, pod_name, tail_lines=10)`

   Actual signature:

   - `stream_pod_logs(pod_name, namespace="default")`

   Problems:

   - Namespace and pod arguments are reversed.
   - `tail_lines` is not an accepted argument.

4. Critical: `/ws/logs/{namespace}/{pod_name}` does not start its producer.

   `prod_task = asyncio.to_thread(producer)` creates a coroutine but does not schedule or await it. The queue will never receive log lines as written.

5. Critical: `/ws/logs/{namespace}/{pod_name}` cleanup calls `prod_task.cancel()`.

   Since `prod_task` is a coroutine from `asyncio.to_thread(...)`, not a task, it does not provide the intended cancellation behavior.

6. High: `LogStreamer._read_loop()` calls `await self.stop()` in `finally`.

   `stop()` cancels `self._read_task`. When called from inside the read task itself, this risks self-cancellation recursion or fragile cleanup behavior.

7. High: `LogStreamer.stop()` catches `Exception`, but `asyncio.CancelledError` may not be caught depending on Python version behavior.

   This can leak cancellation behavior during shutdown.

8. High: `logSocket` auto-connects at import time.

   Any import of `LiveLogsTerminal` or `logSocket` opens `/ws/logs`, even before the user starts streaming.

9. Medium: `logSocket.close()` cannot be reversed cleanly.

   It sets `shouldReconnect = false`, but there is no public connect method that resets it.

10. Medium: `logSocket.onStatus()` does not immediately call the subscriber with current status.

   Pages may initially show stale/default status until the next WebSocket status event.

11. Medium: `LiveLogsTerminal` auto-starts streaming after pod selection.

   Because the effect calls `startStream(...)` when `selectedPod` changes and `streaming` is false, selecting or loading pods can start streaming without pressing Start.

12. Medium: `LiveLogsTerminal` debug logging remains in production code.

   It logs pods, selected pod, selected namespace, and filtered pods to the browser console.

13. Medium: `LiveLogsViewer` direct modal path likely does not work from Dashboard incident cards.

   Dashboard passes only `pod={selectedPod}` to `LiveLogsViewer`, but `LiveLogsViewer` requires both `namespace` and `pod`. Its WebSocket URL becomes `/ws/logs/undefined/{pod}`.

14. Low: Download/copy only uses raw messages.

   The downloaded/copied logs omit formatted timestamps and levels even though the UI displays them.

## Completion Percentage

Estimated Phase 5.3 completion: 45%.

Rationale:

- The UI shell for log streaming is fairly complete.
- The command protocol exists.
- Start, stop, pause, resume, pod selection, namespace selection, auto-scroll, filtering, copy, and download are present.
- However, the main command backend is currently blocked by invalid Python syntax in `log_streamer.py`.
- The frontend pod contract mismatch prevents valid pod names from being sent from `LiveLogsTerminal`.
- The direct log WebSocket endpoint is currently broken by argument mismatch and unscheduled producer logic.
- AI Insights does not consume or show live logs.

## Recommended Implementation Order

1. Fix `backend/app/services/log_streamer.py` syntax.

   Remove the trailing patch marker and run Python compilation.

2. Fix the pod object contract.

   Either normalize `/pods` responses to include `name`, or update `LiveLogsTerminal` to consistently use `pod`. This should be done before testing stream commands.

3. Fix `/ws/logs` command streaming runtime.

   Verify `START_STREAM`, `STOP_STREAM`, `PAUSE_STREAM`, `RESUME_STREAM`, and `CHANGE_POD` end to end.

4. Decide the backend streaming mechanism.

   Prefer Kubernetes Python client streaming for consistency with the rest of the backend, or explicitly standardize on `kubectl logs -f` and document the runtime requirement.

5. Repair or remove `/ws/logs/{namespace}/{pod_name}`.

   If kept, fix argument ordering, remove unsupported `tail_lines`, schedule the producer task, and implement safe cancellation.

6. Fix Dashboard `LiveLogsViewer` usage.

   Pass namespace as well as pod, or route all log viewing through `LiveLogsTerminal`.

7. Add AI Insights log streaming if Phase 5.3 requires it.

   Embed or link the terminal from the active incident context.

8. Improve `logSocket` lifecycle.

   Add explicit connect/disconnect behavior, immediate status replay, tracked reconnect timer cleanup, and a reconnect path after close.

9. Add container selection and previous logs support.

   This is needed for realistic Kubernetes debugging.

10. Add validation tests.

   Validate:

   - `/ws/logs` connects.
   - `START_STREAM` returns live log messages.
   - `STOP_STREAM` stops messages.
   - `PAUSE_STREAM` buffers or pauses as intended.
   - `RESUME_STREAM` resumes.
   - `CHANGE_POD` changes active stream.
   - Namespace and pod selectors send correct values.
   - Download and copy include expected log content.

## Final Assessment

Phase 5.3 has a substantial frontend terminal and a drafted backend command protocol, but it is not complete. The current blockers are runtime-breaking backend syntax, pod field mismatch, and broken direct log WebSocket implementation. Fix those first, then validate the terminal against a real pod that emits continuous logs.
