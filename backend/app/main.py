from dotenv import load_dotenv
load_dotenv()

import logging
from fastapi import FastAPI
from app.api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(title="AI DevOps Copilot")

app.include_router(router)

@app.get("/")
def home():
    return {
        "message": "AI DevOps Copilot Backend Running"
    }

@app.on_event("startup")
async def startup_event():
    logger.info("AI DevOps Copilot Backend Starting Up")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("AI DevOps Copilot Backend Shutting Down")