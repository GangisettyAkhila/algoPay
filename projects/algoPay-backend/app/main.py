"""
AlgoPay Backend - FastAPI Application

Agent-based payment system on Algorand.

Architecture:
- Frontend (React) → Backend API (FastAPI) → Agent Executor → Rule Engine → Payment Executor → Algorand Network
"""

from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.payments import router as payments_router, agent_loop, get_backend_sender


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start agent loop on startup"""
    print("\n" + "=" * 50)
    print("🚀 Starting AlgoPay Agent...")
    print("=" * 50)

    # Initialize backend sender
    sender = get_backend_sender()
    print(f" wallet: {sender[:10]}...")

    # Start agent loop in background
    import asyncio

    asyncio.create_task(agent_loop())

    print("✅ Agent loop started")
    print("=" * 50 + "\n")

    yield

    print("\n👋 Shutting down...")


app = FastAPI(
    title="AlgoPay Agent API",
    description="Agent-based payment system on Algorand blockchain",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(payments_router)


@app.get("/")
async def root():
    return {"service": "algoPay Agent", "version": "1.0.0", "status": "online"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
