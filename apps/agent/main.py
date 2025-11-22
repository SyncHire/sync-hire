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
import httpx
import logging
from typing import List
from datetime import datetime, timezone
from contextlib import asynccontextmanager

# FastAPI imports (for HTTP endpoints)
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Vision-Agents imports
from vision_agents.core.edge.types import User
from vision_agents.core.agents import Agent
from vision_agents.plugins import getstream, openai, gemini, heygen
from vision_agents.plugins.heygen import VideoQuality

# Custom processors
from processors.interview_completion_processor import InterviewCompletionProcessor

# Configuration
from config import Config

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

logger.info("=" * 80)
logger.info("Agent started - logging to agent.log")
logger.info("=" * 80)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    global interview_agent

    # Startup
    logger.info("🚀 Starting SyncHire AI Interview Agent...")

    # Only initialize if API keys are configured
    if Config.STREAM_API_KEY and (Config.GEMINI_API_KEY or Config.OPENAI_API_KEY):
        try:
            await interview_agent.initialize()
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            logger.info("Agent will remain uninitialized - check API keys")
    else:
        logger.warning("⚠️  Skipping agent initialization - missing API keys")
        logger.info("   Set STREAM_API_KEY and (GEMINI_API_KEY or OPENAI_API_KEY)")

    yield

    # Shutdown
    logger.info("🔄 Server shutting down gracefully...")
    # Note: Background interview tasks will continue running autonomously
    # The Vision-Agents framework handles cleanup internally


# Initialize FastAPI app for HTTP endpoints
app = FastAPI(
    title="SyncHire AI Interview Agent",
    description="Vision-Agents powered AI interviewer",
    version="0.2.0",
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
    agent_initialized: bool


def get_llm():
    """Get the appropriate LLM based on available API keys.
    Prioritizes Gemini if API key is set, falls back to OpenAI."""
    if Config.GEMINI_API_KEY:
        logger.info("🤖 Using Gemini Live for realtime audio")
        # Use default model (gemini-2.5-flash-native-audio-preview)
        # which is specifically optimized for native audio
        # Note: Gemini config is passed via environment variable, not constructor
        return gemini.Realtime()
    elif Config.OPENAI_API_KEY:
        logger.info("🤖 Using OpenAI Realtime for audio")
        return openai.Realtime()
    else:
        raise ValueError("No API keys configured. Set GEMINI_API_KEY or OPENAI_API_KEY")


def get_avatar_publisher():
    """Get HeyGen avatar publisher if configured, otherwise return None.

    Note: This creates a wrapper class to add the required 'name' attribute
    that Vision-Agents framework expects from processors.
    """
    if not Config.HEYGEN_API_KEY:
        logger.info("⚠️  HeyGen not configured - agent will be audio-only")
        return None

    # Map quality string to VideoQuality enum
    quality_str = Config.HEYGEN_VIDEO_QUALITY.upper()
    quality_map = {
        "LOW": VideoQuality.LOW,
        "MEDIUM": VideoQuality.MEDIUM,
        "HIGH": VideoQuality.HIGH,
    }
    quality = quality_map.get(quality_str, VideoQuality.LOW)

    logger.info(f"🎭 Configuring HeyGen avatar: {Config.HEYGEN_AVATAR_ID} (Quality: {quality_str})")

    try:
        # Create avatar publisher
        publisher = heygen.AvatarPublisher(
            avatar_id=Config.HEYGEN_AVATAR_ID,
            quality=quality,
            resolution=(1920, 1080),
            api_key=Config.HEYGEN_API_KEY
        )

        # Add 'name' attribute required by Vision-Agents framework
        # This is a workaround for missing attribute in HeyGen plugin
        if not hasattr(publisher, 'name'):
            publisher.name = "heygen_avatar"
            logger.debug("Added 'name' attribute to AvatarPublisher")

        return publisher

    except RuntimeError as e:
        error_msg = str(e)

        # Check for specific HeyGen API errors
        if "Concurrent limit reached" in error_msg:
            logger.error("❌ HeyGen Error: Concurrent session limit reached")
            logger.error("   Your HeyGen plan only allows limited concurrent sessions.")
            logger.error("   Either upgrade your HeyGen plan or wait for other sessions to end.")
            logger.info("⚠️  Continuing without avatar - agent will be audio-only")
        elif "400" in error_msg or "401" in error_msg or "403" in error_msg:
            logger.error(f"❌ HeyGen API Error: {error_msg}")
            logger.error("   Check your HEYGEN_API_KEY and avatar permissions")
            logger.info("⚠️  Continuing without avatar - agent will be audio-only")
        else:
            logger.error(f"❌ HeyGen Error: {error_msg}")
            logger.info("⚠️  Continuing without avatar - agent will be audio-only")

        return None

    except Exception as e:
        logger.error(f"❌ Unexpected error initializing HeyGen avatar: {type(e).__name__}: {e}")
        logger.info("⚠️  Continuing without avatar - agent will be audio-only")
        return None


class InterviewAgent:
    """AI Interviewer Agent using Vision-Agents framework"""

    def __init__(self):
        self.agent = None
        self.current_interview = None
        self.nextjs_webhook_url = Config.NEXTJS_WEBHOOK_URL
        self.is_initialized = False

    async def initialize(self):
        """Initialize the AI agent"""
        if self.is_initialized:
            logger.warning("Agent already initialized")
            return

        logger.info("🤖 Initializing SyncHire AI Interviewer Agent...")

        try:
            # Load instructions
            instructions = self._load_instructions()

            # Create agent with Gemini (preferred) or OpenAI fallback
            self.agent = Agent(
                edge=getstream.Edge(),
                agent_user=User(
                    name="AI Interviewer"
                ),
                instructions=instructions,
                llm=get_llm(),
                processors=[]
            )

            # Register agent user with Stream
            await self.agent.create_user()
            logger.info("✅ Agent initialized successfully")
            self.is_initialized = True

        except Exception as e:
            logger.error(f"❌ Error initializing agent: {e}", exc_info=True)
            raise

    def _load_instructions(self) -> str:
        """Load agent instructions from Markdown file"""
        instructions_path = "interview_instructions.md"

        try:
            with open(instructions_path, "r") as f:
                instructions = f.read()
            logger.info(f"📄 Loaded instructions from {instructions_path}")
            return instructions
        except FileNotFoundError:
            logger.warning(f"⚠️  {instructions_path} not found, using default")
            return self._default_instructions()

    def _default_instructions(self) -> str:
        """Fallback instructions if file not found"""
        return """
You are a professional AI interviewer for SyncHire.

Your role:
1. Greet the candidate warmly and professionally
2. Ask interview questions one at a time
3. Listen carefully to their responses
4. Ask 1-2 follow-up questions for clarification
5. Be supportive and encouraging
6. Maintain a conversational, natural tone
7. After 8-10 questions, thank the candidate and end the interview

Guidelines:
- Speak clearly and at a moderate pace
- Allow 2-3 minutes per question
- Don't interrupt the candidate
- Be patient and understanding
- Keep questions focused and specific
"""

    async def join_interview(
        self,
        call_id: str,
        questions: List[str],
        candidate_name: str,
        job_title: str
    ):
        """
        Join a specific interview call
        Creates a NEW agent instance for this interview to avoid conflicts

        Args:
            call_id: Stream call ID to join
            questions: List of interview questions to ask
            candidate_name: Candidate's name for personalization
            job_title: Job position being interviewed for
        """
        logger.info(f"🎯 Joining interview: {call_id}")
        logger.info(f"📋 Questions to ask: {len(questions)}")

        # Update instructions with personalized context
        logger.info("📝 Personalizing instructions...")
        personalized_instructions = self._personalize_instructions(
            questions, candidate_name, job_title
        )

        # Create a NEW agent instance for this interview
        # This allows multiple concurrent interviews without conflicts
        logger.info("🤖 Creating new agent instance for this interview...")

        # Build processors list
        processors = []

        # Add HeyGen avatar if configured
        avatar_publisher = get_avatar_publisher()
        if avatar_publisher:
            processors.append(avatar_publisher)
            logger.info("✅ HeyGen avatar enabled for this interview")

        interview_agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(
                name="AI Interviewer"
            ),
            instructions=personalized_instructions,
            llm=get_llm(),
            processors=processors
        )

        # Register agent user with Stream
        await interview_agent.create_user()
        logger.info("✅ New agent instance created")

        # Store current interview context
        self.current_interview = {
            "call_id": call_id,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "questions": questions,
            "started_at": datetime.now(timezone.utc).isoformat()
        }

        # Join the existing Stream call (call was already created by Next.js)
        logger.info(f"📞 Getting call reference for: {call_id}")
        call = interview_agent.edge.client.video.call("default", call_id)

        logger.info(f"🔗 Attempting to join call...")
        try:
            # Create smart completion processor
            async def end_call_callback():
                """Callback when interview is detected as complete"""
                logger.info(f"⏰ Waiting 3 seconds for final audio to play...")
                await asyncio.sleep(3)
                logger.info(f"📞 Ending call: {call_id}")
                try:
                    # Close the agent's connection to leave the call
                    if interview_agent._connection:
                        await interview_agent._connection.close()
                        logger.info(f"✅ Call ended successfully")

                        # Send interview completion webhook
                        await self._send_interview_completion_webhook(
                            call_id=call_id,
                            candidate_name=candidate_name,
                            job_title=job_title,
                            duration_minutes=completion_processor.get_duration_minutes()
                        )
                    else:
                        logger.warning(f"⚠️ No active connection to close")
                except Exception as e:
                    logger.error(f"❌ Error leaving call: {e}")

            completion_processor = InterviewCompletionProcessor(
                expected_questions=len(questions),
                minimum_duration_minutes=3,  # Reduced from 8 to 3 minutes
                completion_callback=end_call_callback
            )

            # Add completion processor to agent (after avatar processor if present)
            interview_agent.processors.append(completion_processor)
            await completion_processor.setup(interview_agent)
            logger.info("✅ Interview completion processor added")

            # Join call and let agent run autonomously
            # The agent will automatically detect participants and start the interview
            # It will run in the background without blocking
            await interview_agent.join(call)
            logger.info(f"✅ Agent joined call successfully")

            # Send initial prompt to start the interview
            # Without this, the agent waits for the candidate to speak first
            logger.info(f"🎤 Sending initial prompt to start interview")
            await interview_agent.simple_response(
                text=f"Start the interview now by greeting {candidate_name} and asking the first question."
            )

            # Agent is now running autonomously in the background
            # It will conduct the interview based on instructions
            # The Vision-Agents framework handles the conversation automatically
            logger.info(f"🎯 Agent is now conducting interview autonomously")

            # Wait for smart processor to detect completion (with 15 min timeout)
            await completion_processor.wait_for_completion(timeout=900)

        except Exception as e:
            logger.error(f"❌ Error during interview: {e}", exc_info=True)
            raise

    def _personalize_instructions(
        self,
        questions: List[str],
        candidate_name: str,
        job_title: str
    ) -> str:
        """Add personalized context to agent instructions"""
        base_instructions = self._load_instructions()

        questions_text = "\n".join([
            f"{i+1}. {q}" for i, q in enumerate(questions)
        ])

        personalized = f"""
{base_instructions}

INTERVIEW CONTEXT:
- Candidate: {candidate_name}
- Position: {job_title}

QUESTIONS TO ASK (in order):
{questions_text}

Start the interview by greeting {candidate_name} and asking the first question.
After each answer, either ask a follow-up or move to the next question.
"""
        return personalized

    async def _send_interview_completion_webhook(
        self,
        call_id: str,
        candidate_name: str,
        job_title: str,
        duration_minutes: float
    ):
        """
        Send interview completion webhook to Next.js
        """
        logger.info("📤 Sending interview completion notification...")

        payload = {
            "call_id": call_id,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "duration_minutes": round(duration_minutes, 2),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.nextjs_webhook_url}/api/webhooks/interview-complete",
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info(f"✅ Interview completion notification sent successfully")
            except Exception as e:
                logger.error(f"❌ Failed to send completion webhook: {e}")


# Global agent instance
interview_agent = InterviewAgent()


# FastAPI Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="sync-hire-vision-agent",
        version="0.2.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        agent_initialized=interview_agent.is_initialized
    )


async def _run_interview_background(
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

        # Extract question text from Question objects
        question_texts = [q.text for q in questions]

        await interview_agent.join_interview(
            call_id=call_id,
            questions=question_texts,
            candidate_name=candidate_name,
            job_title=job_title
        )
        logger.info(f"✅ Background task: Agent joined and is conducting interview for {call_id}")
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

    if not interview_agent.is_initialized:
        logger.error("❌ Agent not initialized")
        return {
            "success": False,
            "error": "Agent not initialized - check STREAM_API_KEY and (GEMINI_API_KEY or OPENAI_API_KEY)"
        }

    # Add interview to background tasks
    logger.info(f"➕ Adding interview to background tasks for {request.candidateName}")
    logger.info(f"   Questions: {len(request.questions)} question(s)")

    background_tasks.add_task(
        _run_interview_background,
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

    return {
        "service": "SyncHire AI Interview Agent",
        "version": "0.2.0",
        "status": "running",
        "framework": "Vision-Agents",
        "llm": llm_name,
        "avatar": "HeyGen" if Config.HEYGEN_API_KEY else "Audio-only",
        "agent_initialized": interview_agent.is_initialized,
        "endpoints": {
            "health": "/health",
            "join_interview": "/join-interview (POST)",
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
