"""
Agent Manager for SyncHire

Manages multiple concurrent interview agents, handling lifecycle,
cleanup, and resource management.
"""

import asyncio
import httpx
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

from vision_agents.core.edge.types import User
from vision_agents.core.agents import Agent
from vision_agents.plugins import getstream, openai, gemini, heygen, deepgram
from vision_agents.plugins.heygen import VideoQuality

from processors.interview_completion_processor import InterviewCompletionProcessor
from config import Config

logger = logging.getLogger(__name__)


def _get_llm():
    """Get the appropriate LLM for processing."""
    if Config.GEMINI_API_KEY:
        if Config.GEMINI_USE_REALTIME:
            logger.info("🤖 Using Gemini Live (realtime)")
            return gemini.Realtime()
        else:
            logger.info(f"🤖 Using Gemini LLM (model: {Config.GEMINI_MODEL})")
            return gemini.LLM(Config.GEMINI_MODEL)
    elif Config.OPENAI_API_KEY:
        logger.info("🤖 Using OpenAI Realtime")
        return openai.Realtime()
    else:
        raise ValueError("No API keys configured. Set GEMINI_API_KEY or OPENAI_API_KEY")


def _get_stt():
    """Get STT instance. Returns None for Realtime LLMs with built-in STT."""
    if Config.GEMINI_USE_REALTIME:
        logger.info("🎤 Using Gemini Realtime built-in STT")
        return None

    if Config.OPENAI_API_KEY and not Config.GEMINI_API_KEY:
        logger.info("🎤 Using OpenAI Realtime built-in STT")
        return None

    logger.info("🎤 Configuring Deepgram STT")
    return deepgram.STT(api_key=Config.DEEPGRAM_API_KEY)


def _get_avatar_publisher():
    """Get HeyGen avatar publisher if configured."""
    if not Config.HEYGEN_API_KEY:
        logger.info("⚠️  HeyGen not configured - agent will be audio-only")
        return None

    quality_map = {
        "LOW": VideoQuality.LOW,
        "MEDIUM": VideoQuality.MEDIUM,
        "HIGH": VideoQuality.HIGH,
    }
    quality = quality_map.get(Config.HEYGEN_VIDEO_QUALITY.upper(), VideoQuality.LOW)
    logger.info(f"🎭 Configuring HeyGen avatar: {Config.HEYGEN_AVATAR_ID}")

    try:
        publisher = heygen.AvatarPublisher(
            avatar_id=Config.HEYGEN_AVATAR_ID,
            quality=quality,
            resolution=(1920, 1080),
            api_key=Config.HEYGEN_API_KEY,
            mute_llm_audio=False
        )
        if not hasattr(publisher, 'name'):
            publisher.name = "heygen_avatar"
        return publisher

    except RuntimeError as e:
        error_msg = str(e)
        if "Concurrent limit reached" in error_msg:
            logger.error("❌ HeyGen: Concurrent session limit reached")
        else:
            logger.error(f"❌ HeyGen Error: {error_msg}")
        logger.info("⚠️  Continuing without avatar - agent will be audio-only")
        return None

    except Exception as e:
        logger.error(f"❌ Unexpected HeyGen error: {type(e).__name__}: {e}")
        return None


@dataclass
class ActiveAgent:
    """Tracks an active interview agent and its metadata"""
    call_id: str
    agent: Agent
    candidate_name: str
    job_title: str
    completion_processor: Optional[InterviewCompletionProcessor] = None
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def duration_seconds(self) -> float:
        return (datetime.now(timezone.utc) - self.started_at).total_seconds()


class AgentManager:
    """
    Manages multiple concurrent interview agents.

    Provides:
    - Agent lifecycle management (create, track, shutdown)
    - Concurrent interview support
    - Resource cleanup on shutdown
    """

    def __init__(self):
        self._agents: Dict[str, ActiveAgent] = {}
        self._lock = asyncio.Lock()
        self.nextjs_webhook_url = Config.NEXTJS_WEBHOOK_URL

    @property
    def active_count(self) -> int:
        return len(self._agents)

    def get_active_calls(self) -> List[str]:
        return list(self._agents.keys())

    def is_call_active(self, call_id: str) -> bool:
        return call_id in self._agents

    async def start_interview(
        self,
        call_id: str,
        questions: List[dict],
        candidate_name: str,
        job_title: str
    ) -> None:
        """
        Start an interview by creating and joining an agent to the call.

        Args:
            call_id: Stream call ID to join
            questions: List of question dicts with 'text' and 'category' keys
            candidate_name: Candidate's name
            job_title: Job position
        """
        if self.is_call_active(call_id):
            logger.warning(f"Interview already active for call {call_id}")
            return

        logger.info(f"🎯 Starting interview: {call_id}")
        logger.info(f"📋 Questions: {len(questions)}")

        # Build personalized instructions
        instructions = self._build_instructions(questions, candidate_name, job_title)

        # Build processors list
        processors = []
        avatar_publisher = _get_avatar_publisher()
        if avatar_publisher:
            processors.append(avatar_publisher)
            logger.info("✅ HeyGen avatar enabled")

        # Create agent
        agent = Agent(
            edge=getstream.Edge(),
            agent_user=User(name="AI Interviewer"),
            instructions=instructions,
            llm=_get_llm(),
            stt=_get_stt(),
            processors=processors
        )

        await agent.create_user()
        logger.info("✅ Agent instance created")

        # Wire HeyGen audio track if using avatar
        if avatar_publisher:
            logger.info("🎵 Wiring HeyGen audio track")
            agent._audio_track = avatar_publisher.publish_audio_track()

        # Get call reference
        call = agent.edge.client.video.call("default", call_id)

        # Create completion processor (agent_user_id will be set after join)
        completion_processor = InterviewCompletionProcessor(
            questions=questions,
            minimum_duration_minutes=3,
            call=call,
        )

        agent.processors.append(completion_processor)
        await completion_processor.setup(agent)

        # Register agent before joining
        async with self._lock:
            self._agents[call_id] = ActiveAgent(
                call_id=call_id,
                agent=agent,
                candidate_name=candidate_name,
                job_title=job_title,
                completion_processor=completion_processor
            )
        logger.info(f"Registered agent (total active: {self.active_count})")

        try:
            # Join call
            await agent.join(call)
            logger.info("✅ Agent joined call")

            # Update processor with agent user ID (now available after join)
            if hasattr(agent, 'agent_user') and agent.agent_user:
                completion_processor.agent_user_id = agent.agent_user.id
                logger.info(f"✅ Custom events enabled (agent_user_id: {agent.agent_user.id})")
            else:
                logger.warning("⚠️ Custom events disabled - agent user ID not available")

            # Send initial prompt
            await agent.simple_response(
                text=f"Start the interview now by greeting {candidate_name} and asking the first question."
            )
            logger.info("🎯 Agent conducting interview autonomously")

            # Wait for completion (15 min timeout)
            await completion_processor.wait_for_completion(timeout=900)

            # Interview complete - wait for final audio to finish streaming
            logger.info(f"⏰ Interview complete for {call_id}, waiting for final audio...")
            await asyncio.sleep(5)

            # Get data before cleanup
            duration = completion_processor.get_duration_minutes()
            transcript = completion_processor.get_transcript()

            # Cleanup and send webhook
            await self._finish_interview(
                call_id=call_id,
                candidate_name=candidate_name,
                job_title=job_title,
                duration_minutes=duration,
                transcript=transcript
            )

        except Exception as e:
            logger.error(f"❌ Error during interview: {e}", exc_info=True)
            await self.shutdown_agent(call_id)
            raise

    async def _finish_interview(
        self,
        call_id: str,
        candidate_name: str,
        job_title: str,
        duration_minutes: float,
        transcript: List[dict]
    ) -> None:
        """Cleanup interview and send webhook"""
        async with self._lock:
            if call_id not in self._agents:
                return

            active = self._agents[call_id]
            agent = active.agent

            try:
                # Close HeyGen session first
                for processor in agent.processors:
                    if hasattr(processor, '_rtc_manager'):
                        try:
                            if hasattr(processor._rtc_manager, 'close'):
                                await processor._rtc_manager.close()
                            logger.info("✅ HeyGen session closed")
                        except Exception as e:
                            logger.warning(f"⚠️ Error closing HeyGen: {e}")

                # Close connection
                if agent._connection:
                    await agent._connection.close()
                    logger.info("✅ Call ended")

            except Exception as e:
                logger.error(f"❌ Error ending call: {e}")

            # Remove from tracking
            del self._agents[call_id]
            logger.info(f"Unregistered agent (remaining: {len(self._agents)})")

        # Send webhook outside lock
        await self._send_completion_webhook(
            call_id=call_id,
            candidate_name=candidate_name,
            job_title=job_title,
            duration_minutes=duration_minutes,
            transcript=transcript
        )

    async def shutdown_agent(self, call_id: str) -> bool:
        """Shutdown a specific agent by call ID."""
        async with self._lock:
            if call_id not in self._agents:
                logger.warning(f"No agent found for call {call_id}")
                return False

            active = self._agents[call_id]
            await self._cleanup_agent(active)
            del self._agents[call_id]
            logger.info(f"Shutdown agent for {call_id}")
            return True

    async def shutdown_all(self) -> int:
        """Shutdown all active agents."""
        async with self._lock:
            count = len(self._agents)
            if count == 0:
                return 0

            logger.info(f"Shutting down {count} agent(s)...")
            cleanup_tasks = [
                self._cleanup_agent(active)
                for active in self._agents.values()
            ]
            await asyncio.gather(*cleanup_tasks, return_exceptions=True)
            self._agents.clear()
            logger.info(f"Shutdown complete")
            return count

    async def _cleanup_agent(self, active: ActiveAgent) -> None:
        """Cleanup a single agent's resources."""
        agent = active.agent
        try:
            for processor in agent.processors:
                if hasattr(processor, '_rtc_manager'):
                    try:
                        if hasattr(processor._rtc_manager, 'close'):
                            await processor._rtc_manager.close()
                    except Exception as e:
                        logger.warning(f"Error closing HeyGen: {e}")

            if agent._connection:
                await agent._connection.close()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    async def _send_completion_webhook(
        self,
        call_id: str,
        candidate_name: str,
        job_title: str,
        duration_minutes: float,
        transcript: List[dict] = None
    ) -> None:
        """Send interview completion webhook to Next.js"""
        payload = {
            "interviewId": call_id,
            "candidateName": candidate_name,
            "jobTitle": job_title,
            "durationMinutes": round(duration_minutes, 2),
            "completedAt": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "transcript": transcript or []
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.nextjs_webhook_url}/api/webhooks/interview-complete",
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info("✅ Completion webhook sent")
            except Exception as e:
                logger.error(f"❌ Failed to send webhook: {e}")

    def _build_instructions(
        self,
        questions: List[dict],
        candidate_name: str,
        job_title: str
    ) -> str:
        """Build personalized agent instructions."""
        base = self._load_instructions()
        questions_text = "\n".join([f"{i+1}. {q['text']}" for i, q in enumerate(questions)])

        return f"""{base}

INTERVIEW CONTEXT:
- Candidate: {candidate_name}
- Position: {job_title}

QUESTIONS TO ASK (in order):
{questions_text}

Start the interview by greeting {candidate_name} and asking the first question.
After each answer, either ask a follow-up or move to the next question.
"""

    def _load_instructions(self) -> str:
        """Load agent instructions from file."""
        try:
            with open("interview_instructions.md", "r") as f:
                return f.read()
        except FileNotFoundError:
            return """You are a professional AI interviewer for SyncHire.

Your role:
1. Greet the candidate warmly and professionally
2. Ask interview questions one at a time
3. Listen carefully to their responses
4. Ask 1-2 follow-up questions for clarification
5. Be supportive and encouraging
6. After 8-10 questions, thank the candidate and end the interview
"""

    def get_status(self) -> Dict:
        """Get status information about all active agents."""
        return {
            "active_count": len(self._agents),
            "agents": [
                {
                    "call_id": active.call_id,
                    "candidate_name": active.candidate_name,
                    "job_title": active.job_title,
                    "started_at": active.started_at.isoformat(),
                    "duration_seconds": round(active.duration_seconds, 1)
                }
                for active in self._agents.values()
            ]
        }
