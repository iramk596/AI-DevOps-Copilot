"""
WebSocket Routes for Real-Time Cluster Telemetry Streaming

Provides enterprise-grade websocket endpoints for streaming:
- Pod updates
- Cluster metrics
- Incident alerts
- Container status changes
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
import logging
import asyncio

from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/cluster")
async def websocket_cluster_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time cluster monitoring.
    
    Features:
    - Accepts multiple concurrent clients
    - Broadcasts cluster telemetry (pods, metrics, incidents)
    - Maintains persistent connection with heartbeat
    - Graceful disconnect handling
    
    Message Types:
    - cluster_update: Pod status, metrics, incidents
    - heartbeat: Keep-alive signal
    - connection_established: Initial connection confirmation
    """
    try:
        await manager.connect(websocket)
        
        # Send connection established message
        await manager.send_personal_message(
            {
                "type": "connection_established",
                "message": "Connected to cluster monitoring",
                "timestamp": __import__("time").time(),
            },
            websocket
        )
        
        logger.info(
            f"Client connected. "
            f"Total connections: {manager.get_connection_count()}"
        )
        
        # Keep connection open and handle incoming messages
        while True:
            try:
                # Receive messages from client
                # (typically heartbeat acknowledgments or commands)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                
                # Log client message
                logger.debug(f"Received from client: {data}")
                
            except asyncio.TimeoutError:
                # No message received, continue listening
                # Connection remains open for server broadcasts
                continue
                
            except WebSocketDisconnect:
                # Client disconnected
                await manager.disconnect(websocket)
                logger.info(
                    f"Client disconnected. "
                    f"Total connections: {manager.get_connection_count()}"
                )
                break
                
    except Exception as exc:
        logger.error(f"WebSocket error: {exc}")
        try:
            await manager.disconnect(websocket)
        except Exception:
            pass
