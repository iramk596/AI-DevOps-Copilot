from fastapi import APIRouter

from app.services.kubernetes_service import (
    get_all_pods,
    analyze_cluster_issues
)

router = APIRouter()


@router.get("/")
def home():
    return {"message": "AI DevOps Copilot Backend Running"}


@router.get("/health")
def health_check():
    return {"status": "healthy"}


@router.get("/pods")
def get_pods():
    return get_all_pods()


@router.get("/analyze")
def analyze_cluster():
    return analyze_cluster_issues()