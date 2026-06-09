from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.pods import router as pods_router
from app.api.websocket_routes import router as ws_router
import asyncio
import time
from collections import deque

from app.services.websocket_manager import manager
from app.services.kubernetes_service import (
    analyze_cluster_issues,
    get_all_pods,
    get_cluster_metrics,
)
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
app.include_router(ws_router)

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
    """Start background monitoring and telemetry tasks."""
    logger.info("AI DevOps Copilot Backend Starting Up")
    
    # Metrics history for trend analysis
    cpu_history = deque(maxlen=20)  # Keep last 20 data points
    memory_history = deque(maxlen=20)
    
    async def monitor_clusters():
        """
        Background task: Stream real-time cluster telemetry every 5 seconds.
        
        Broadcasts:
        - Pod status and updates
        - Cluster metrics (CPU, memory)
        - Incident detection and analysis
        - Connection heartbeats
        """
        heartbeat_counter = 0
        
        while True:
            try:
                # Fetch current cluster state
                pods = get_all_pods()
                issues = analyze_cluster_issues()

                # Calculate cluster statistics
                failed = sum(1 for p in pods if p.get("status") != "Running")
                running = sum(1 for p in pods if p.get("status") == "Running")
                total = len(pods)
                incident_count = len(issues)

                # Determine overall cluster health
                if incident_count > 0:
                    cluster_health = "degraded"
                elif failed > 0:
                    cluster_health = "warning"
                else:
                    cluster_health = "healthy"

                # AI Analysis for new incidents (async, non-blocking)
                for issue in issues:
                    issue_key = (
                        f"{issue.get('namespace')}:"
                        f"{issue.get('pod')}:"
                        f"{issue.get('status')}"
                    )
                    
                    if issue_key not in manager.seen_incidents:
                        manager.seen_incidents.add(issue_key)
                        
                        # Run AI analysis asynchronously
                        try:
                            ai_response = await asyncio.to_thread(
                                analyze_logs_with_ai,
                                issue.get("logs", "")
                            )
                            issue["ai_analysis"] = ai_response
                            logger.info(
                                f"AI analysis for {issue.get('pod')}: "
                                f"{ai_response[:100]}..."
                            )
                        except Exception as ai_err:
                            logger.warning(f"AI analysis failed: {ai_err}")
                            issue["ai_analysis"] = (
                                "AI analysis unavailable"
                            )

                # Fetch cluster metrics
                metrics = get_cluster_metrics()
                
                # Generate synthetic CPU/Memory trends (improved)
                # In production, use metrics-server or Prometheus
                cpu_value = min(95, max(10, metrics.get("running_pods", 0) * 5))
                memory_value = min(90, max(20, metrics.get("running_pods", 0) * 8))
                
                cpu_history.append({
                    "time": int(time.time()),
                    "value": cpu_value,
                })
                memory_history.append({
                    "time": int(time.time()),
                    "value": memory_value,
                })

                # Build cluster update payload
                payload = {
                    "type": "cluster_update",
                    "timestamp": int(time.time()),
                    "data": {
                        "pods": [
                            {
                                "name": p.get("pod"),
                                "namespace": p.get("namespace"),
                                "status": p.get("status"),
                                "node": p.get("node"),
                                "restarts": p.get("restarts", 0),
                            }
                            for p in pods
                        ],
                        "stats": {
                            "running": running,
                            "failed": failed,
                            "total": total,
                            "cluster_health": cluster_health,
                        },
                        "cpu_history": list(cpu_history),
                        "memory_history": list(memory_history),
                        "incidents": issues,
                        "metrics": metrics,
                    },
                }

                # Broadcast to all connected clients
                await manager.broadcast(payload)
                
                logger.debug(
                    f"Broadcast update: "
                    f"{running} running, "
                    f"{failed} failed, "
                    f"{incident_count} incidents, "
                    f"{manager.get_connection_count()} clients"
                )

            except Exception as e:
                logger.exception(f"Cluster monitoring error: {e}")

            await asyncio.sleep(5)  # Stream every 5 seconds

    # Start the background monitoring task
    asyncio.create_task(monitor_clusters())

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on backend shutdown."""
    logger.info("AI DevOps Copilot Backend Shutting Down")