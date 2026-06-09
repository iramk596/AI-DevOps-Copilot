from fastapi import WebSocket
import logging
import json
from typing import Dict, List

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Enterprise-grade WebSocket connection manager.
    Handles multiple concurrent clients with robust connection tracking.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.seen_incidents: set = set()

    async def connect(self, websocket: WebSocket):
        """
        Accept and register a new WebSocket connection.
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            f"WebSocket client connected. "
            f"Active connections: {len(self.active_connections)}"
        )

    async def disconnect(self, websocket: WebSocket):
        """
        Safely remove a disconnected client.
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            f"WebSocket client disconnected. "
            f"Active connections: {len(self.active_connections)}"
        )

    async def broadcast(self, data: Dict):
        """
        Broadcast message to all connected clients.
        Automatically removes disconnected clients.
        """
        disconnected = []

        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception as exc:
                logger.warning(
                    f"Removing disconnected WebSocket: {exc}"
                )
                disconnected.append(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            await self.disconnect(connection)

    async def send_personal_message(self, data: Dict, websocket: WebSocket):
        """
        Send a message to a specific client.
        """
        try:
            await websocket.send_json(data)
        except Exception as exc:
            logger.warning(f"Failed to send personal message: {exc}")
            await self.disconnect(websocket)

    async def send_heartbeat(self):
        """
        Send heartbeat to keep connections alive.
        """
        heartbeat_msg = {"type": "heartbeat"}
        disconnected = []

        for connection in list(self.active_connections):
            try:
                await connection.send_json(heartbeat_msg)
            except Exception as exc:
                logger.warning(f"Heartbeat failed: {exc}")
                disconnected.append(connection)

        for connection in disconnected:
            await self.disconnect(connection)

    def get_connection_count(self) -> int:
        """
        Get the current number of active connections.
        """
        return len(self.active_connections)


# Global manager instance
manager = ConnectionManager()