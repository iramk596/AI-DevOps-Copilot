from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="AI DevOps Copilot")

app.include_router(router)

@app.get("/")
def home():
    return {"message": "AI DevOps Copilot Backend Running"}