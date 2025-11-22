"""
SyncHire AI Interview Agent
Powered by GetStream Vision-Agents with Gemini Live

This agent:
1. Joins interview calls when invited
2. Asks personalized interview questions
3. Listens to candidate responses
4. Adapts questions based on answers
5. Sends results to Next.js webhook
"""

import asyncio
import logging
import warnings
from typing import List
from datetime import datetime, timezone
from contextlib import asynccontextmanager

# Suppress dataclasses_json warnings from getstream SDK
# These are about optional fields missing in API responses - not actionable
warnings.filterwarnings("ignore", module="dataclasses_json.core", category=RuntimeWarning)

# FastAPI imports (for HTTP endpoints)
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configuration
from config import Config

# Agent Manager
from agents.agent_manager import AgentManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler('agent.log', mode='a')  # File output
    ]
)
logger = logging.getLogger(__name__)

# Enable DEBUG logging for vision_agents to see more details
logging.getLogger("vision_agents").setLevel(logging.INFO)
logging.getLogger("vision_agents.plugins.gemini").setLevel(logging.INFO)
logging.getLogger("vision_agents.plugins.openai").setLevel(logging.INFO)

# WebRTC/ICE logging level - configurable via LOG_LEVEL_WEBRTC env var
# Set to DEBUG to diagnose STUN/TURN errors like "403 - Forbidden IP"
webrtc_log_level = getattr(logging, Config.LOG_LEVEL_WEBRTC.upper(), logging.WARNING)
logging.getLogger("aiortc").setLevel(webrtc_log_level)
logging.getLogger("aioice").setLevel(webrtc_log_level)
logging.getLogger("getstream.video.rtc").setLevel(webrtc_log_level)
logging.getLogger("vision_agents.plugins.heygen").setLevel(webrtc_log_level)

# Silence httpx INFO logs (Stream API requests)
logging.getLogger("httpx").setLevel(logging.WARNING)

logger.info("=" * 80)
logger.info("Agent started - logging to agent.log")
logger.info("=" * 80)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    logger.info("🚀 Starting SyncHire AI Interview Agent...")

    # Create agent manager
    app.state.agent_manager = AgentManager()

    # Validate API keys are configured
    if Config.validate():
        logger.info("✅ API keys validated successfully")

        # Log agent configuration
        logger.info("📋 Agent Configuration:")
        if Config.GEMINI_API_KEY:
            if Config.GEMINI_USE_REALTIME:
                logger.info("   LLM: Gemini Live (realtime)")
                logger.info("   STT: Built-in (Gemini)")
            else:
                logger.info(f"   LLM: Gemini ({Config.GEMINI_MODEL})")
                logger.info("   STT: Deepgram")
        else:
            logger.info("   LLM: OpenAI Realtime")
            logger.info("   STT: Built-in (OpenAI)")
        logger.info(f"   Avatar: {'HeyGen' if Config.HEYGEN_API_KEY else 'Audio-only'}")
        logger.info(f"   WebRTC Log Level: {Config.LOG_LEVEL_WEBRTC}")
    else:
        logger.warning("⚠️  Missing API keys - agent will not be able to join interviews")
        logger.info("   Required: STREAM_API_KEY and LLM key (GEMINI_API_KEY or OPENAI_API_KEY)")
        logger.info("   DEEPGRAM_API_KEY only needed for text-based Gemini (not Realtime)")

    yield

    # Shutdown
    logger.info("🔄 Server shutting down gracefully...")
    shutdown_count = await app.state.agent_manager.shutdown_all()
    if shutdown_count > 0:
        logger.info(f"   Shutdown {shutdown_count} active agent(s)")


# Initialize FastAPI app for HTTP endpoints
app = FastAPI(
    title="SyncHire AI Interview Agent",
    description="Vision-Agents powered AI interviewer",
    version="0.3.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class Question(BaseModel):
    """Individual interview question"""
    id: str
    text: str
    type: str
    duration: int
    category: str  # Interview stage: Introduction, Technical Skills, etc.


class JoinInterviewRequest(BaseModel):
    """Request to join an interview"""
    callId: str
    questions: List[Question]
    candidateName: str
    jobTitle: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    timestamp: str
    config_valid: bool
    active_interviews: int


# FastAPI Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="sync-hire-vision-agent",
        version="0.3.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        config_valid=Config.validate(),
        active_interviews=app.state.agent_manager.active_count
    )


async def _run_interview_background(
    agent_manager: AgentManager,
    call_id: str,
    questions: List[Question],
    candidate_name: str,
    job_title: str
):
    """
    Background task to run the interview
    This allows the HTTP endpoint to return immediately
    The agent will join the call and run autonomously without blocking
    """
    try:
        logger.info(f"🎯 Background task: Starting interview for {candidate_name}")

        # Convert Question objects to dicts with text and category
        question_data = [{"text": q.text, "category": q.category} for q in questions]

        await agent_manager.start_interview(
            call_id=call_id,
            questions=question_data,
            candidate_name=candidate_name,
            job_title=job_title
        )
        logger.info(f"✅ Background task: Interview completed for {call_id}")
    except asyncio.CancelledError:
        logger.info(f"⚠️  Background task cancelled for {call_id}")
        raise
    except Exception as e:
        logger.error(f"❌ Background task: Error in interview {call_id}: {e}", exc_info=True)


@app.post("/join-interview")
async def join_interview(request: JoinInterviewRequest, background_tasks: BackgroundTasks):
    """
    Join an interview call

    This endpoint is called by Next.js to invite the agent to a call.
    The interview runs in a background task so the endpoint returns immediately.
    """
    logger.info(f"📞 Received join-interview request for call: {request.callId}")

    if not Config.validate():
        logger.error("❌ Agent configuration invalid")
        return {
            "success": False,
            "error": "Agent configuration invalid - check STREAM_API_KEY and LLM keys (GEMINI_API_KEY or OPENAI_API_KEY). DEEPGRAM_API_KEY is required when using text-based Gemini."
        }

    agent_manager: AgentManager = app.state.agent_manager

    # Check if already active
    if agent_manager.is_call_active(request.callId):
        logger.warning(f"⚠️  Interview already active for call: {request.callId}")
        return {
            "success": False,
            "error": "Interview already in progress for this call"
        }

    # Add interview to background tasks
    logger.info(f"➕ Adding interview to background tasks for {request.candidateName}")
    logger.info(f"   Questions: {len(request.questions)} question(s)")

    background_tasks.add_task(
        _run_interview_background,
        agent_manager=agent_manager,
        call_id=request.callId,
        questions=request.questions,
        candidate_name=request.candidateName,
        job_title=request.jobTitle
    )

    logger.info(f"✅ Interview task scheduled: {request.callId}")
    return {
        "success": True,
        "message": "Agent will join interview shortly",
        "callId": request.callId
    }


@app.get("/agents/status")
async def agents_status():
    """Get status of all active agents"""
    return app.state.agent_manager.get_status()


@app.post("/agents/{call_id}/shutdown")
async def shutdown_agent(call_id: str):
    """Shutdown a specific agent by call ID"""
    success = await app.state.agent_manager.shutdown_agent(call_id)
    if success:
        return {"success": True, "message": f"Agent for {call_id} shutdown"}
    return {"success": False, "error": f"No active agent for {call_id}"}


@app.get("/")
async def root():
    """Root endpoint"""
    # Determine which LLM is active
    if Config.GEMINI_API_KEY:
        llm_name = "Google Gemini 2.0 Flash"
    elif Config.OPENAI_API_KEY:
        llm_name = "OpenAI GPT-4o Realtime"
    else:
        llm_name = "None (no API keys configured)"

    agent_manager: AgentManager = app.state.agent_manager

    return {
        "service": "SyncHire AI Interview Agent",
        "version": "0.3.0",
        "status": "running",
        "framework": "Vision-Agents",
        "llm": llm_name,
        "avatar": "HeyGen" if Config.HEYGEN_API_KEY else "Audio-only",
        "config_valid": Config.validate(),
        "active_interviews": agent_manager.active_count,
        "endpoints": {
            "health": "/health",
            "join_interview": "/join-interview (POST)",
            "agents_status": "/agents/status",
            "shutdown_agent": "/agents/{call_id}/shutdown (POST)",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=Config.PORT,
        reload=True,
        log_level="info",
    )
