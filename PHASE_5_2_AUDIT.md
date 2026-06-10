# Phase 5.2 WebSocket Audit

## Scope

Inspected primary requested files:

- `backend/app/main.py`
- `backend/app/api/websocket_routes.py`
- `backend/app/services/websocket_manager.py`
- `backend/app/services/kubernetes_service.py`
- `frontend/src/services/socket.js`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/Cluster.jsx`
- `frontend/src/pages/Incidents.jsx`
- `frontend/src/pages/AIInsights.jsx`

Additional endpoint inventory check:

- `backend/app/api/routes.py`
- `frontend/src/services/logSocket.js`
- `frontend/src/services/ws.js`

No implementation files were modified.

## Current Architecture

The current architecture is a backend-polling, frontend-push WebSocket model.

On backend startup, `backend/app/main.py` creates a background `monitor_clusters()` task. Every 5 seconds it:

- Fetches pods through `get_all_pods()`.
- Detects unhealthy pods through `analyze_cluster_issues()`.
- Calls AI analysis for newly seen incidents.
- Calls `get_cluster_metrics()`.
- Builds a `cluster_update` payload.
- Broadcasts that payload to all active `/ws/cluster` clients through the global `ConnectionManager`.

The frontend imports a singleton WebSocket client from `frontend/src/services/socket.js`. That singleton connects to `/ws/cluster`, routes messages by `type`, exposes status listeners, and supports unsubscribe callbacks.

So the frontend receives telemetry through WebSocket pushes, but the backend source of truth is still a timed poll against Kubernetes every 5 seconds.

## Existing WebSocket Implementation

### Backend

`backend/app/api/websocket_routes.py` defines the main cluster monitoring endpoint:

- Accepts WebSocket clients.
- Registers them with `ConnectionManager`.
- Sends a `connection_established` message after connect.
- Keeps the connection open by waiting for inbound client messages with a 60-second timeout.
- Handles `WebSocketDisconnect`.

`backend/app/services/websocket_manager.py` provides:

- `connect(websocket)`
- `disconnect(websocket)`
- `broadcast(data)`
- `send_personal_message(data, websocket)`
- `send_heartbeat()`
- `get_connection_count()`
- `seen_incidents` tracking for deduplicating AI analysis work.

`backend/app/main.py` provides the actual telemetry broadcaster:

- Broadcasts only one telemetry message type: `cluster_update`.
- Includes pods, stats, synthetic CPU history, synthetic memory history, incidents, and basic metrics.
- Broadcast interval is 5 seconds.

### Frontend

`frontend/src/services/socket.js` provides:

- Singleton cluster WebSocket connection.
- Auto-connect on module load.
- Manual `connect()` and `disconnect()`.
- Message routing by message type.
- Generic `*` message listeners.
- Connection status listeners.
- Exponential reconnect with max delay of 30 seconds.
- Client heartbeat ping every 30 seconds.
- Unsubscribe callbacks for message and status listeners.
- Cleanup on `beforeunload`.

## WebSocket Endpoints

Confirmed endpoints:

- `/ws/cluster`
  - Defined in `backend/app/api/websocket_routes.py`.
  - Main cluster telemetry stream.
  - Mounted by `app.include_router(ws_router)` in `backend/app/main.py`.

- `/ws/logs/{namespace}/{pod_name}`
  - Defined in `backend/app/api/routes.py`.
  - Intended for direct pod log streaming.

- `/ws/logs`
  - Defined in `backend/app/api/routes.py`.
  - Command-based log streaming endpoint supporting commands such as `START_STREAM`, `STOP_STREAM`, `PAUSE_STREAM`, `RESUME_STREAM`, and `CHANGE_POD`.

Potential frontend-only stale endpoint:

- `/ws`
  - Referenced by `frontend/src/services/ws.js` in `createWebsocket()`.
  - No matching backend endpoint was found.
  - This appears unused by the audited pages, but it is a risk if imported elsewhere.

## Telemetry Delivery

Cluster telemetry is pushed from backend to frontend over `/ws/cluster` as `cluster_update`.

However, the backend gathers that telemetry by polling Kubernetes APIs every 5 seconds inside `monitor_clusters()`. It is not using Kubernetes watch streams, metrics-server streaming, Prometheus subscriptions, or event watches.

Summary:

- Backend to frontend: WebSocket push.
- Kubernetes to backend: periodic polling.
- Frontend page data loading in the audited pages: primarily WebSocket subscriptions, not REST polling.

## Frontend Page Consumption

### Dashboard

`Dashboard.jsx` consumes live WebSocket events:

- Calls `socket.connect()`.
- Subscribes to connection status through `socket.onStatus()`.
- Subscribes to `cluster_update`.
- Updates cluster stats and incidents from the payload.
- Attempts to update CPU and memory chart history from top-level payload fields.

Issue: the backend sends CPU and memory histories as `payload.cpu_history` and `payload.memory_history`, but Dashboard looks for top-level scalar fields such as `payload.cpu_usage`, `payload.cpuUsage`, `payload.stats.cpu_usage`, and `payload.stats.cpuUsage`. As written, the Dashboard CPU and memory charts will usually remain at their initial zero values.

### Cluster

`Cluster.jsx` consumes live WebSocket events:

- Subscribes to connection status.
- Subscribes to `cluster_update`.
- Updates pod table from `msg.data.pods`.
- Builds recent cluster activity entries locally.

Cluster CPU and memory values are not consumed from backend metrics. They are calculated locally from running pod count.

### Incidents

`Incidents.jsx` consumes live WebSocket events:

- Calls `socket.connect()`.
- Subscribes to connection status.
- Subscribes to `cluster_update` and uses `payload.data.incidents`.
- Also subscribes to an `incident` message type.

Issue: backend does not currently broadcast standalone `incident` messages. Incidents are only included inside `cluster_update`.

### AIInsights

`AIInsights.jsx` consumes live WebSocket events:

- Calls `socket.connect()`.
- Subscribes to connection status.
- Subscribes to `cluster_update` and uses `payload.data.incidents`.
- Also subscribes to an `incident` message type.

Issue: backend does not currently broadcast standalone `incident` messages. The page has a fallback hard-coded incident when no live incident exists.

## Reconnect Logic

Reconnect logic exists in `frontend/src/services/socket.js`.

Details:

- On unexpected close, status changes to `disconnected`, then `reconnecting`.
- Reconnect uses exponential backoff.
- Delay starts at 1 second and caps at 30 seconds.
- `maxAttempts` is configured as `Infinity`, but the value is not actually used to stop retries.

Additional reconnect logic exists in `frontend/src/services/logSocket.js` and `frontend/src/services/ws.js` for log streaming or older clients.

## Connection Status Handling

Connection status handling exists.

`frontend/src/services/socket.js` supports statuses:

- `disconnected`
- `connecting`
- `connected`
- `reconnecting`
- `error`

Audited pages consume status:

- `Dashboard.jsx`: renders Connected, Reconnecting, Connecting, or Disconnected.
- `Cluster.jsx`: renders Connected, Reconnecting, or Offline.
- `Incidents.jsx`: renders WebSocket Connected or Disconnected.
- `AIInsights.jsx`: renders WebSocket Connected or Disconnected.

Backend exposes connection count through `manager.get_connection_count()`, but no admin/status endpoint was found for it in the audited implementation.

## Cleanup and Unsubscribe Logic

Frontend cleanup exists at the component-subscription level:

- `socket.on()` returns an unsubscribe function.
- `socket.onStatus()` returns an unsubscribe function.
- `Dashboard.jsx`, `Cluster.jsx`, `Incidents.jsx`, and `AIInsights.jsx` call unsubscribe functions on unmount.
- `Dashboard.jsx` also removes its `logs:view` window event listener on unmount.

Global socket cleanup exists:

- `socket.disconnect()` clears message handlers, status handlers, heartbeat interval, reconnect timeout, and closes the WebSocket.
- A `beforeunload` handler calls `socketService.disconnect()`.

Backend cleanup exists:

- `ConnectionManager.broadcast()` removes connections that fail during send.
- `/ws/cluster` disconnect handling calls `manager.disconnect(websocket)`.

Risks:

- `socket.disconnect()` sets `closedByUser = true`, but `socket.connect()` only connects when `!closedByUser && !ws`. There is no method to reset `closedByUser` to `false`. After an explicit `disconnect()`, the singleton cannot reconnect in the same page lifecycle.
- The singleton auto-connects at module import time, so pages that import it may open a connection even before a component explicitly calls `connect()`.

## CPU and Memory Streaming

CPU and memory are not fully implemented as live real metrics.

Backend behavior:

- `get_cluster_metrics()` returns only pod counts: running, failed, total.
- `main.py` derives synthetic CPU and memory values from running pod count.
- These synthetic values are appended to `cpu_history` and `memory_history`.
- The histories are included in the `cluster_update` payload.

Frontend behavior:

- `Dashboard.jsx` does not consume `payload.cpu_history` or `payload.memory_history`; it looks for scalar CPU/memory fields that backend does not send.
- `Cluster.jsx` computes CPU and memory locally from pod count instead of using backend metrics.

Conclusion:

- CPU and memory history fields are technically streamed inside `cluster_update`.
- Actual CPU and memory metrics are not streamed.
- The main Dashboard charts do not currently consume the streamed history fields.

## Incident Streaming

Incidents are partially streamed.

Backend behavior:

- `analyze_cluster_issues()` detects unhealthy pods.
- `monitor_clusters()` includes the full `issues` list in every `cluster_update`.
- AI analysis is added only for issue keys not already present in `manager.seen_incidents`.

Frontend behavior:

- `Dashboard.jsx`, `Incidents.jsx`, and `AIInsights.jsx` consume incidents from `cluster_update`.
- `Incidents.jsx` and `AIInsights.jsx` also subscribe to a standalone `incident` event.

Missing behavior:

- Backend does not broadcast standalone `incident` events.
- There is no explicit incident lifecycle event model, such as created, updated, resolved, or acknowledged.
- `seen_incidents` deduplicates AI analysis but does not track resolution or repeat incidents after recovery.

Conclusion:

- Incidents are delivered live as part of cluster snapshots.
- Incidents are not streamed as dedicated incident events.

## Bugs and Risks

1. Dashboard CPU and memory chart mismatch

   Backend sends `cpu_history` and `memory_history`, but Dashboard reads scalar fields such as `cpu_usage` and `memory_usage`. This prevents the Dashboard charts from reflecting the backend-streamed histories.

2. No real resource metrics

   `get_cluster_metrics()` only returns pod counts. CPU and memory values are synthetic estimates derived from running pod count.

3. Standalone `incident` event is consumed but not produced

   `Incidents.jsx` and `AIInsights.jsx` subscribe to `incident`, but the backend only broadcasts `cluster_update`.

4. Backend heartbeat method is unused

   `ConnectionManager.send_heartbeat()` exists, and `/ws/cluster` documentation mentions heartbeat messages, but the startup broadcaster never calls it. The client sends ping messages, but the backend only logs inbound messages and does not respond with pong.

5. Explicit disconnect prevents later reconnect

   `socket.disconnect()` sets `closedByUser = true`; `connect()` does not reset it. This is acceptable for page unload but risky if any UI or future flow tries to reconnect after manual disconnect.

6. Import-time auto-connect can create unexpected sockets

   `socket.js` calls `connect()` at module load. This makes connection lifecycle less explicit and can open a socket just by importing the service.

7. Duplicate or stale WebSocket clients exist

   `frontend/src/services/ws.js` references `/ws`, which does not appear to exist. There are multiple WebSocket helper implementations, increasing drift risk.

8. Log endpoint risk

   The direct log route in `backend/app/api/routes.py` appears to call `stream_pod_logs(namespace, pod_name, tail_lines=10)`, while the inspected `stream_pod_logs()` signature is `stream_pod_logs(pod_name, namespace="default")`. This suggests the direct log endpoint may have argument ordering and unsupported keyword issues.

9. Background monitor task is not retained or cancelled

   `asyncio.create_task(monitor_clusters())` is started on startup, but the task handle is not stored and there is no explicit cancellation on shutdown.

10. `seen_incidents` can grow without bounds

   Incident keys are never removed. In a long-running backend with many pod names/statuses, this set can grow indefinitely.

11. Snapshot-based incidents can hide lifecycle transitions

   The current stream sends complete incident snapshots every 5 seconds. It does not distinguish new, ongoing, resolved, or repeated incidents.

12. WebSocket route has no authentication or authorization

   `/ws/cluster` accepts any client that can reach the backend. This may be acceptable for local development, but it is a production risk.

## Answers to Required Questions

1. What WebSocket functionality already exists?

   Cluster telemetry broadcast over `/ws/cluster`, connection management, frontend singleton client, reconnect logic, status listeners, unsubscribe callbacks, and log-stream WebSocket endpoints.

2. Which WebSocket endpoints exist?

   `/ws/cluster`, `/ws/logs/{namespace}/{pod_name}`, and `/ws/logs`. A frontend helper also references `/ws`, but no backend endpoint was found for it.

3. Is telemetry pushed via WebSocket or fetched via REST polling?

   Frontend telemetry is pushed via WebSocket. Backend telemetry is gathered by polling Kubernetes every 5 seconds.

4. Do frontend pages consume live WebSocket events?

   Yes. Dashboard, Cluster, Incidents, and AIInsights consume `cluster_update`. Incidents and AIInsights also subscribe to `incident`, but that event is not produced by the backend.

5. Does reconnect logic exist?

   Yes. `frontend/src/services/socket.js` reconnects with exponential backoff up to a 30-second delay.

6. Is connection status handled?

   Yes. The socket service tracks status and all audited pages display some form of connection state.

7. Does WebSocket cleanup/unsubscribe logic exist?

   Yes. Components unsubscribe on unmount, and socket-level cleanup exists. There are lifecycle risks around import-time auto-connect and one-way manual disconnect.

8. Are CPU and memory metrics streamed live?

   Partially. Synthetic CPU and memory histories are sent inside `cluster_update`, but real CPU/memory metrics are not collected, and the Dashboard does not currently consume the streamed history fields.

9. Are incidents streamed live?

   Partially. Incidents are included in the recurring `cluster_update` snapshot. Dedicated `incident` events are not broadcast.

10. Is Phase 5.2 complete?

   No. The foundation exists, but Phase 5.2 is not complete because real CPU/memory metrics are not streamed, Dashboard metric consumption is mismatched, standalone incident events are missing, heartbeat behavior is incomplete, and lifecycle/security risks remain.

## Estimated Completion Percentage

Estimated completion: 65%.

Rationale:

- Core backend WebSocket route exists.
- Core frontend WebSocket client exists.
- Reconnect, status, and unsubscribe mechanics exist.
- Main pages consume live cluster snapshots.
- However, real resource metrics are missing, CPU/memory UI wiring is broken, incidents are snapshot-only, standalone incident events are not implemented, and several lifecycle risks remain.

## Exact Remaining Tasks for Phase 5.2

1. Fix Dashboard metric consumption.

   Update Dashboard to consume `payload.cpu_history` and `payload.memory_history`, or change the backend payload to include the scalar fields Dashboard expects.

2. Replace synthetic CPU and memory values with real metrics.

   Integrate metrics-server, Prometheus, or Kubernetes metrics APIs and stream actual CPU/memory usage.

3. Define and implement a stable telemetry payload contract.

   Document fields for `cluster_update`, including pods, stats, metrics, CPU history, memory history, incidents, and timestamps.

4. Add dedicated incident event streaming.

   Emit standalone `incident` events or remove frontend subscriptions to `incident`. If implemented, include event types such as created, updated, resolved, and repeated.

5. Add incident lifecycle tracking.

   Track when incidents disappear, resolve, reappear, or change status. Avoid relying only on the permanent `seen_incidents` set.

6. Implement heartbeat semantics consistently.

   Either call backend `send_heartbeat()` periodically or respond to client `ping` messages with `pong` or `heartbeat`. Align frontend and backend expectations.

7. Fix explicit reconnect lifecycle.

   Allow `socket.connect()` to reconnect after `disconnect()` when intentional, or split permanent shutdown from temporary disconnect.

8. Remove or consolidate stale WebSocket clients.

   Decide whether `frontend/src/services/ws.js`, `frontend/src/services/logSocket.js`, and `frontend/src/services/socket.js` should all remain. Remove or update clients that reference nonexistent endpoints.

9. Fix or verify log WebSocket endpoints.

   Confirm `stream_pod_logs()` arguments and direct log route behavior. Correct the apparent parameter mismatch before relying on `/ws/logs/{namespace}/{pod_name}`.

10. Manage backend background task lifecycle.

   Store the `monitor_clusters()` task handle and cancel it during FastAPI shutdown.

11. Add authentication or authorization for WebSocket endpoints.

   Protect `/ws/cluster` and log WebSocket endpoints before production use.

12. Add tests or verification scripts.

   Cover connection establishment, broadcast payload shape, reconnect behavior, unsubscribe cleanup, Dashboard metric updates, incident delivery, and log stream behavior.

13. Add operational observability.

   Track active connection count, broadcast failures, last broadcast timestamp, and backend monitor health.

## Final Assessment

Phase 5.2 has a functional WebSocket foundation and live page subscriptions, but it is not production-complete. The most important blockers are the CPU/memory payload mismatch, lack of real resource metrics, lack of dedicated incident event streaming, incomplete heartbeat semantics, and cleanup/lifecycle risks.
