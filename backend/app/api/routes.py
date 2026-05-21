from fastapi import APIRouter

from app.services.queue_service import incident_queue
from app.services.incident_service import process_incident

from app.services.kubernetes_service import (
    get_all_pods,
    analyze_cluster_issues,
    get_pod_logs
)

from app.services.openai_service import analyze_logs_with_ai

router = APIRouter()


@router.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


@router.get("/pods")
def get_pods():

    return get_all_pods()


@router.get("/analyze")
def analyze_cluster():

    try:

        issues = analyze_cluster_issues()

        for issue in issues:

            print("Sending logs to AI...")

            ai_response = analyze_logs_with_ai(
                issue["logs"]
            )

            print("AI RESPONSE:", ai_response)

            issue["ai_analysis"] = ai_response

        return issues

    except Exception as e:

        print("ANALYZE ERROR:", str(e))

        return {
            "error": str(e)
        }


@router.get("/logs/{namespace}/{pod_name}")
def pod_logs(namespace: str, pod_name: str):

    logs = get_pod_logs(
        namespace,
        pod_name
    )

    return {
        "pod": pod_name,
        "namespace": namespace,
        "logs": logs
    }


@router.post("/incident")
def create_incident(payload: dict):

    job = incident_queue.enqueue(
        process_incident,
        payload
    )

    return {
        "message": "Incident queued successfully",
        "job_id": job.id
    }