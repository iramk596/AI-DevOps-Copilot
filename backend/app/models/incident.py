from typing import Optional, List
from pydantic import BaseModel, RootModel
from datetime import datetime


class IncidentIssue(BaseModel):
    """
    Kubernetes pod failure incident model.
    Returned by /analyze endpoint and rendered by frontend IncidentCard.
    """
    pod: str
    namespace: str
    status: str
    phase: str
    possible_reason: str
    suggestion: str
    logs: str
    container: Optional[str] = None
    timestamp: Optional[str] = None
    ai_analysis: Optional[str] = ""

    model_config = {
        "json_schema_extra": {
            "example": {
                "pod": "crash-app-5d4f7c8b9e",
                "namespace": "default",
                "status": "Failed",
                "phase": "Failed",
                "possible_reason": "CrashLoopBackOff: Application exiting with code 1",
                "suggestion": "Pod 'crash-app-5d4f7c8b9e' is crashing repeatedly. Check container logs for errors, verify environment variables, and ensure dependencies are available.",
                "logs": "[Error logs here...]",
                "container": "crash-app",
                "timestamp": "2026-05-25T10:30:00",
                "ai_analysis": "The application appears to have a startup configuration issue."
            }
        }
    }


class AnalysisResponse(RootModel[List[IncidentIssue]]):
    """Response from /analyze endpoint - list of incidents"""
    root: List[IncidentIssue]
