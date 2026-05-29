import asyncio
from typing import List
from fastapi import WebSocket


class WebsocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.lock = asyncio.Lock()
        self.seen_incidents = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # send JSON message to all active connections
        dead = []
        async with self.lock:
            conns = list(self.active_connections)

        for conn in conns:
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)

        if dead:
            async with self.lock:
                for d in dead:
                    if d in self.active_connections:
                        self.active_connections.remove(d)


manager = WebsocketManager()
