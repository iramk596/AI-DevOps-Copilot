from fastapi import APIRouter

from app.services.kubernetes_service import (
    get_all_pods,
    analyze_cluster_issues
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

    issues = analyze_cluster_issues()

    for issue in issues:

        ai_response = analyze_logs_with_ai(
            issue["logs"]
        )

        issue["ai_analysis"] = ai_response

    return issues