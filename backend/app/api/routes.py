from fastapi import APIRouter

from app.services.kubernetes_service import (
    get_all_pods,
    analyze_cluster_issues
)

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "healthy"}


@router.get("/pods")
def get_pods():

    pods = get_all_pods()

    return pods


@router.get("/analyze")
def analyze_cluster():

    issues = analyze_cluster_issues()

    return issues