import time

from fastapi import APIRouter, HTTPException, Request
from kubernetes import client
from typing import List

from app.services.queue_service import incident_queue
from app.services.incident_service import process_incident
from app.models.incident import IncidentIssue

from app.services.kubernetes_service import (
    get_all_pods,
    analyze_cluster_issues,
    get_cluster_metrics,
    get_k8s_client,
    get_pod_logs,
    stream_pod_logs,
)

from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from app.services.websocket_manager import manager

from app.services.openai_service import analyze_logs_with_ai

router = APIRouter()


@router.get("/health")
def health_check():
    """Simple health check - no K8s involved"""
    return {
        "status": "healthy"
    }


@router.get("/test")
def test_endpoint():
    """Test endpoint that doesn't require Kubernetes"""
    return {
        "message": "API is working",
        "timestamp": "2026-05-25T14:00:00Z"
    }


@router.get("/pods")
def get_pods():

    return get_all_pods()


@router.get("/analyze")
def analyze_cluster(request: Request) -> List[IncidentIssue]:
    """
    Analyze Kubernetes cluster for failed pods.
    Returns list of incidents with AI analysis.
    """
    try:

        # Dev-only mock response: return a static incident when ?mock=true
        if request.query_params.get("mock") == "true":
            return [
                {
                    "pod": "mock-crash-app",
                    "namespace": "default",
                    "status": "CrashLoopBackOff",
                    "phase": "Running",
                    "possible_reason": "Application failed during startup",
                    "suggestion": "Check startup configuration",
                    "logs": "Application failed to start\n",
                    "container": None,
                    "timestamp": None,
                    "ai_analysis": "Mock analysis: application failed to start."
                }
            ]

        issues = analyze_cluster_issues()

        for issue in issues:

            try:
                print(f"Analyzing logs for pod: {issue['pod']}")

                ai_response = analyze_logs_with_ai(
                    issue["logs"]
                )

                print(f"AI RESPONSE for {issue['pod']}: {ai_response}")

                issue["ai_analysis"] = ai_response

            except Exception as ai_error:
                print(f"AI Analysis error for {issue['pod']}: {str(ai_error)}")
                issue["ai_analysis"] = "AI analysis unavailable"

        return issues

    except Exception as e:

        print(f"ANALYZE ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Cluster analysis failed: {str(e)}"
        )


@router.get("/logs/{namespace}/{pod_name}")
def pod_logs(namespace: str, pod_name: str):

    try:
        logs = get_pod_logs(
            namespace,
            pod_name
        )

        return {
            "pod": pod_name,
            "namespace": namespace,
            "logs": logs
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve logs: {str(e)}"
        )


@router.get("/logs/health")
def logs_health_check():
    """Simple health check for Kubernetes log streaming readiness."""
    try:
        v1 = get_k8s_client()
        v1.list_namespace(limit=1)
        return {
            "status": "healthy",
            "message": "Kubernetes log streaming backend is available.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Logs health check failed: {str(e)}"
        )


@router.post("/restart-pod/{namespace}/{pod_name}")
def restart_pod(namespace: str, pod_name: str):

    try:

        v1 = client.CoreV1Api()

        v1.delete_namespaced_pod(
            name=pod_name,
            namespace=namespace
        )

        return {
            "message": f"Pod {pod_name} restarted successfully"
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to restart pod: {str(e)}"
        )


@router.post("/delete-pod/{namespace}/{pod_name}")
def delete_pod(namespace: str, pod_name: str):

    try:

        v1 = client.CoreV1Api()

        v1.delete_namespaced_pod(
            name=pod_name,
            namespace=namespace
        )

        return {
            "message": f"Pod {pod_name} deleted successfully"
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete pod: {str(e)}"
        )


@router.post("/incident")
def create_incident(payload: dict):

    try:
        job = incident_queue.enqueue(
            process_incident,
            payload
        )

        return {
            "message": "Incident queued successfully",
            "job_id": job.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue incident: {str(e)}"
        )


def build_cluster_payload():
    pods = get_all_pods()
    issues = analyze_cluster_issues()

    failed = sum(1 for p in pods if p.get("status") != "Running")
    running = sum(1 for p in pods if p.get("status") == "Running")
    cluster_health = "degraded" if failed > 0 else "healthy"
    incident_count = len(issues)

    metrics = get_cluster_metrics()

    return {
        "type": "cluster_update",
        "timestamp": int(time.time()),
        "failed_pod_count": failed,
        "running_pod_count": running,
        "cluster_health": cluster_health,
        "incident_count": incident_count,
        "incidents": issues,
        "metrics": metrics,
    }


# WebSocket endpoint for live cluster updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:
        try:
            initial_payload = build_cluster_payload()
            await websocket.send_json(initial_payload)
        except Exception:
            pass

        # keep the connection open; clients may send pings
        while True:
            try:
                msg = await websocket.receive_text()
                # optional: handle client pings or commands
                if msg == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break

    finally:
        await manager.disconnect(websocket)


# WebSocket endpoint for streaming pod logs
@router.websocket("/ws/logs/{namespace}/{pod_name}")
async def logs_websocket(websocket: WebSocket, namespace: str, pod_name: str):
    await websocket.accept()

    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def producer():
        try:
            for line in stream_pod_logs(namespace, pod_name, tail_lines=10):
                loop.call_soon_threadsafe(queue.put_nowait, line)
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, f"__STREAM_ERROR__:{e}")
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    prod_task = asyncio.to_thread(producer)

    try:
        while True:
            line = await queue.get()
            if line is None:
                break
            if isinstance(line, str) and line.startswith("__STREAM_ERROR__:"):
                try:
                    await websocket.send_text(line.replace("__STREAM_ERROR__:", "Error streaming logs: "))
                except Exception:
                    pass
                break

            try:
                await websocket.send_text(line)
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        return
    finally:
        try:
            prod_task.cancel()
        except Exception:
            pass