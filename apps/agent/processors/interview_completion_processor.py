"""
Interview Completion Processor
Intelligently detects when the interview is complete based on conversation context.
Broadcasts AI transcript via Stream.io custom events for accurate frontend display.
"""
import asyncio
import logging
import time
from typing import Optional, List, Any
from dataclasses import dataclass, field, asdict
from vision_agents.core.processors import Processor
from vision_agents.core.events.base import BaseEvent
from vision_agents.core.llm.events import (
    RealtimeAgentSpeechTranscriptionEvent,
    RealtimeUserSpeechTranscriptionEvent,
)

logger = logging.getLogger(__name__)


@dataclass
class CustomCallEvent(BaseEvent):
    """Custom event class to handle Stream.io custom call events.
    This prevents the framework from logging errors when receiving custom events.
    """
    type: str = "custom"
    custom: dict = field(default_factory=dict)


@dataclass
class TranscriptEntry:
    """Single transcript entry"""
    speaker: str  # "agent" or "user"
    text: str
    timestamp: float  # seconds since interview start

    def to_dict(self) -> dict:
        return asdict(self)


class InterviewCompletionProcessor(Processor):
    """
    Processor that detects when an interview is naturally complete.

    Detection logic:
    1. Agent says closing keywords (goodbye, luck, etc.)
    2. Agent hasn't spoken for 10+ seconds after closing
    3. Total questions asked >= expected questions
    4. Interview duration >= minimum time (8 minutes)

    Also collects full transcript for webhook and sends progress events.
    """

    def __init__(
        self,
        questions: List[dict],
        minimum_duration_minutes: int = 8,
        completion_callback: Optional[callable] = None,
        call: Any = None,
        agent_user_id: str = "",
    ):
        super().__init__()
        self.questions = questions  # List of {text, category} dicts
        self.expected_questions = len(questions)
        self.minimum_duration_minutes = minimum_duration_minutes
        self.completion_callback = completion_callback
        self.call = call  # Stream.io call for sending custom events
        self.agent_user_id = agent_user_id

        # Track conversation state
        self.questions_asked = 0
        self.current_question_index = 0
        self.agent_closing_phrases = []
        self.last_agent_speech_time = None
        self.interview_start_time = None
        self.is_complete = asyncio.Event()

        # Transcript collection
        self.transcript: List[TranscriptEntry] = []

        # Closing keywords and phrases
        self.closing_keywords = {
            "goodbye", "good bye", "bye",
            "luck", "best wishes",
            "thank you for your time", "thanks for sharing",
            "we'll be in touch", "be in touch",
            "that concludes", "wraps up",
        }

        # Question indicators (to count questions asked)
        self.question_indicators = {
            "tell me about", "can you explain", "what about",
            "how did you", "why did you", "describe",
            "walk me through", "what was your", "?",
        }

    async def _send_transcript_event(self, speaker: str, text: str, timestamp: float):
        """Send transcript to frontend via Stream.io custom event"""
        if not self.call or not self.agent_user_id:
            return

        try:
            await self.call.send_call_event(
                user_id=self.agent_user_id,
                custom={
                    "type": "transcript",
                    "speaker": speaker,
                    "text": text,
                    "timestamp": timestamp,
                }
            )
            logger.debug(f"📤 Sent transcript event: {speaker}: {text[:50]}...")
        except Exception as e:
            logger.warning(f"⚠️ Failed to send transcript event: {e}")

    async def _send_progress_event(self, question_index: int, category: str):
        """Send progress update to frontend via Stream.io custom event"""
        if not self.call or not self.agent_user_id:
            return

        try:
            await self.call.send_call_event(
                user_id=self.agent_user_id,
                custom={
                    "type": "progress",
                    "questionIndex": question_index,
                    "category": category,
                    "totalQuestions": self.expected_questions,
                }
            )
            logger.info(f"📊 Sent progress event: question {question_index + 1}/{self.expected_questions} ({category})")
        except Exception as e:
            logger.warning(f"⚠️ Failed to send progress event: {e}")

    def _check_question_match(self, speech_text: str) -> bool:
        """Check if agent speech matches the next question and update progress"""
        if self.current_question_index >= len(self.questions):
            return False

        next_question = self.questions[self.current_question_index]
        question_text = next_question["text"].lower()
        speech_lower = speech_text.lower()

        # Check if significant portion of the question text appears in the speech
        # Use first 30 chars or key phrases from the question
        key_phrase = question_text[:50] if len(question_text) > 50 else question_text
        words = key_phrase.split()
        # Match if at least 3 consecutive words from question appear in speech
        for i in range(len(words) - 2):
            phrase = " ".join(words[i:i+3])
            if phrase in speech_lower:
                return True

        return False

    async def setup(self, agent):
        """Initialize processor when agent starts"""
        self.interview_start_time = time.time()
        logger.info("🎬 Interview completion processor initialized")

        # Register custom event class to prevent framework errors when receiving our events
        agent.events.register(CustomCallEvent)

        @agent.events.subscribe
        async def on_agent_speech(event: RealtimeAgentSpeechTranscriptionEvent):
            """Track agent speech to detect closing and questions"""
            self.last_agent_speech_time = time.time()
            text = event.text.strip()
            text_lower = text.lower()

            # Add to transcript and broadcast to frontend
            if text:
                elapsed = time.time() - self.interview_start_time
                self.transcript.append(TranscriptEntry(
                    speaker="agent",
                    text=text,
                    timestamp=round(elapsed, 2)
                ))
                # Send to frontend via custom event
                await self._send_transcript_event("agent", text, round(elapsed, 2))

            # Count questions and check for question transitions
            if any(indicator in text_lower for indicator in self.question_indicators):
                self.questions_asked += 1
                logger.debug(f"📊 Questions asked: {self.questions_asked}/{self.expected_questions}")

                # Check if this matches a specific question and update progress
                if self._check_question_match(text):
                    current_q = self.questions[self.current_question_index]
                    await self._send_progress_event(
                        self.current_question_index,
                        current_q["category"]
                    )
                    self.current_question_index += 1

            # Detect closing phrases
            if any(keyword in text_lower for keyword in self.closing_keywords):
                self.agent_closing_phrases.append(text)
                logger.info(f"👋 Agent used closing phrase: '{text}'")

                # Check if interview should complete
                await self._check_completion()

        @agent.events.subscribe
        async def on_user_speech(event: RealtimeUserSpeechTranscriptionEvent):
            """Track user responses (helps confirm interview is active)"""
            text = event.text.strip()
            text_lower = text.lower()

            # Add to transcript and broadcast to frontend
            # Note: Gemini realtime often only provides punctuation for user speech
            # The frontend also uses Stream.io closed captions as a backup
            if text and len(text) > 1:  # Skip if only punctuation
                elapsed = time.time() - self.interview_start_time
                self.transcript.append(TranscriptEntry(
                    speaker="user",
                    text=text,
                    timestamp=round(elapsed, 2)
                ))
                # Send to frontend via custom event
                await self._send_transcript_event("user", text, round(elapsed, 2))
                logger.debug(f"📝 User transcript: {text[:50]}...")

            # If user also says goodbye, definitely time to end
            if "goodbye" in text_lower or "bye" in text_lower:
                logger.info(f"👋 User said goodbye: '{text}'")
                await self._mark_complete("User said goodbye")

    async def _check_completion(self):
        """Smart completion check based on multiple signals"""
        # Calculate interview duration
        duration_minutes = (time.time() - self.interview_start_time) / 60 if self.interview_start_time else 0

        # Completion criteria
        has_closing_phrase = len(self.agent_closing_phrases) > 0
        enough_questions = self.questions_asked >= self.expected_questions - 1  # Allow 1 question variance
        enough_time = duration_minutes >= self.minimum_duration_minutes

        logger.info(f"""
📊 Interview completion check:
  - Closing phrases: {len(self.agent_closing_phrases)} (need: 1+)
  - Questions asked: {self.questions_asked}/{self.expected_questions}
  - Duration: {duration_minutes:.1f}/{self.minimum_duration_minutes} min
  - Has closing: {has_closing_phrase}
  - Enough questions: {enough_questions}
  - Enough time: {enough_time}
        """)

        # Decision logic: Need closing phrase + (enough questions OR enough time)
        if has_closing_phrase and (enough_questions or enough_time):
            reason = []
            if has_closing_phrase:
                reason.append("agent said goodbye")
            if enough_questions:
                reason.append(f"asked {self.questions_asked} questions")
            if enough_time:
                reason.append(f"{duration_minutes:.1f} min duration")

            await self._mark_complete(", ".join(reason))
        else:
            logger.debug("⏳ Not complete yet - continuing interview")

    async def _mark_complete(self, reason: str):
        """Mark interview as complete and trigger callback"""
        if not self.is_complete.is_set():
            logger.info(f"✅ Interview marked complete: {reason}")
            self.is_complete.set()

            if self.completion_callback:
                await self.completion_callback()

    async def wait_for_completion(self, timeout: float = 900):
        """Wait for interview to complete"""
        try:
            await asyncio.wait_for(self.is_complete.wait(), timeout=timeout)
            logger.info("✅ Interview completion detected")
        except asyncio.TimeoutError:
            logger.warning(f"⏰ Interview timeout after {timeout/60:.1f} minutes")
            await self._mark_complete(f"timeout after {timeout/60:.1f} minutes")

    def get_duration_minutes(self) -> float:
        """Get interview duration in minutes"""
        if self.interview_start_time:
            return (time.time() - self.interview_start_time) / 60
        return 0

    def get_transcript(self) -> List[dict]:
        """Get full transcript as list of dicts"""
        return [entry.to_dict() for entry in self.transcript]
