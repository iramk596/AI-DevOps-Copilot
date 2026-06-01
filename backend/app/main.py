from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.pods import router as pods_router
import asyncio
import time

from app.services.websocket_manager import manager
from app.services.kubernetes_service import analyze_cluster_issues, get_all_pods, get_cluster_metrics
from app.services.openai_service import analyze_logs_with_ai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(title="AI DevOps Copilot")

app.include_router(router)
app.include_router(pods_router, prefix="/api")

# Allow CORS for local frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "AI DevOps Copilot Backend Running"
    }

@app.on_event("startup")
async def startup_event():
    logger.info("AI DevOps Copilot Backend Starting Up")
    # start background monitoring task
    async def monitor_clusters():
        while True:
            try:
                pods = get_all_pods()
                issues = analyze_cluster_issues()

                failed = sum(1 for p in pods if p.get("status") != "Running")
                running = sum(1 for p in pods if p.get("status") == "Running")
                incident_count = len(issues)

                cluster_health = "degraded" if failed > 0 else "healthy"

                # Attach minimal AI analysis for new incidents asynchronously
                for issue in issues:
                    key = f"{issue.get('namespace')}:{issue.get('pod')}:{issue.get('status')}"
                    if key not in manager.seen_incidents:
                        manager.seen_incidents.add(key)
                        # run AI analysis in thread to avoid blocking
                        try:
                            ai_resp = await asyncio.to_thread(analyze_logs_with_ai, issue.get("logs", ""))
                            issue["ai_analysis"] = ai_resp
                        except Exception:
                            issue["ai_analysis"] = "AI analysis unavailable"

                # collect cluster metrics (may be empty if metrics-server not present)
                metrics = get_cluster_metrics()

                payload = {
                    "type": "cluster_update",
                    "timestamp": int(time.time()),
                    "failed_pod_count": failed,
                    "running_pod_count": running,
                    "cluster_health": cluster_health,
                    "incident_count": incident_count,
                    "incidents": issues,
                    "metrics": metrics
                }

                await manager.broadcast(payload)

            except Exception as e:
                logger.exception(f"Monitor error: {e}")

            await asyncio.sleep(5)

    asyncio.create_task(monitor_clusters())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("AI DevOps Copilot Backend Shutting Down")