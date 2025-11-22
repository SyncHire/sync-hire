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

        # Agent speech accumulator for question matching
        self.agent_speech_accumulator = ""
        self.accumulator_last_update = None
        self.ACCUMULATOR_GAP_THRESHOLD = 2.0  # seconds - reset accumulator after this gap

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

    def _check_question_match(self, accumulated_text: str) -> Optional[int]:
        """Check if accumulated agent speech matches any upcoming question.
        Returns the question index if matched, None otherwise."""
        if self.current_question_index >= len(self.questions):
            return None

        accumulated_lower = accumulated_text.lower()
        accumulated_words = set(accumulated_lower.split())

        # Check questions starting from current index
        for idx in range(self.current_question_index, len(self.questions)):
            question = self.questions[idx]
            question_text = question["text"].lower()
            question_words = set(question_text.split())

            # Calculate word overlap percentage
            if len(question_words) == 0:
                continue

            common_words = accumulated_words & question_words
            # Ignore common filler words
            filler_words = {"the", "a", "an", "is", "are", "was", "were", "to", "for", "and", "or", "in", "on", "at", "of", "your", "you", "me", "can", "could", "would", "about", "with"}
            meaningful_common = common_words - filler_words
            meaningful_question = question_words - filler_words

            if len(meaningful_question) == 0:
                continue

            match_ratio = len(meaningful_common) / len(meaningful_question)

            # Match if 40%+ of meaningful question words appear in accumulated speech
            if match_ratio >= 0.4:
                logger.info(f"📊 Question match: {match_ratio:.0%} overlap for Q{idx + 1}")
                return idx

        return None

    async def setup(self, agent):
        """Initialize processor when agent starts"""
        self.interview_start_time = time.time()
        logger.info("🎬 Interview completion processor initialized")

        # Register custom event class to prevent framework errors when receiving our events
        agent.events.register(CustomCallEvent)

        async def _check_accumulator_for_question():
            """Check accumulated speech for question match and send progress if found"""
            if not self.agent_speech_accumulator:
                return

            matched_idx = self._check_question_match(self.agent_speech_accumulator)
            if matched_idx is not None and matched_idx >= self.current_question_index:
                current_q = self.questions[matched_idx]
                await self._send_progress_event(matched_idx, current_q["category"])
                self.current_question_index = matched_idx + 1
                self.questions_asked = matched_idx + 1
                logger.info(f"📊 Progress updated to Q{matched_idx + 1} based on accumulated speech")

            # Reset accumulator after checking
            self.agent_speech_accumulator = ""

        @agent.events.subscribe
        async def on_agent_speech(event: RealtimeAgentSpeechTranscriptionEvent):
            """Track agent speech to detect closing and questions"""
            now = time.time()
            text = event.text.strip()
            text_lower = text.lower()

            # Check if there's been a gap - if so, check accumulated text first
            if self.accumulator_last_update is not None:
                gap = now - self.accumulator_last_update
                if gap > self.ACCUMULATOR_GAP_THRESHOLD:
                    await _check_accumulator_for_question()

            # Add to transcript and broadcast to frontend
            if text:
                elapsed = now - self.interview_start_time
                self.transcript.append(TranscriptEntry(
                    speaker="agent",
                    text=text,
                    timestamp=round(elapsed, 2)
                ))
                # Send to frontend via custom event
                await self._send_transcript_event("agent", text, round(elapsed, 2))

                # Accumulate speech for question matching
                if self.agent_speech_accumulator:
                    self.agent_speech_accumulator += " " + text
                else:
                    self.agent_speech_accumulator = text
                self.accumulator_last_update = now

            self.last_agent_speech_time = now

            # Detect closing phrases - mark wrap-up/final section as complete
            if any(keyword in text_lower for keyword in self.closing_keywords):
                self.agent_closing_phrases.append(text)
                logger.info(f"👋 Agent used closing phrase: '{text}'")

                # Mark the last question (wrap-up) as reached
                if self.current_question_index < len(self.questions):
                    last_idx = len(self.questions) - 1
                    last_q = self.questions[last_idx]
                    await self._send_progress_event(last_idx, last_q["category"])
                    self.current_question_index = len(self.questions)
                    logger.info(f"📊 Marked wrap-up complete (Q{last_idx + 1})")

                # Check if interview should complete
                await self._check_completion()

        @agent.events.subscribe
        async def on_user_speech(event: RealtimeUserSpeechTranscriptionEvent):
            """Track user responses (helps confirm interview is active)"""
            # User speaking = turn change, check accumulated agent speech for question match
            await _check_accumulator_for_question()

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
