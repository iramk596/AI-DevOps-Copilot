from fastapi import APIRouter, HTTPException
from kubernetes import client
from typing import List

from app.services.queue_service import incident_queue
from app.services.incident_service import process_incident
from app.models.incident import IncidentIssue

from app.services.kubernetes_service import (
    get_all_pods,
    analyze_cluster_issues,
    get_pod_logs
)

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
def analyze_cluster() -> List[IncidentIssue]:
    """
    Analyze Kubernetes cluster for failed pods.
    Returns list of incidents with AI analysis.
    """
    try:

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