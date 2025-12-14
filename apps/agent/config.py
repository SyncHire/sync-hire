"""
Configuration management for SyncHire AI Agent
Loads environment variables and validates settings
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load .env file (development)
load_dotenv()

# Determine environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"


class Config:
    """Application configuration"""

    # Cached validation result
    _validated: bool | None = None

    # Environment
    ENVIRONMENT: str = ENVIRONMENT
    IS_PRODUCTION: bool = IS_PRODUCTION

    # API Security (shared secret between Next.js and FastAPI)
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "")

    # Stream Video
    STREAM_API_KEY: str = os.getenv("STREAM_API_KEY", "")
    STREAM_API_SECRET: Optional[str] = os.getenv("STREAM_API_SECRET")

    # OpenAI
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-realtime-preview")

    # Alternative: Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_USE_REALTIME: bool = os.getenv("GEMINI_USE_REALTIME", "false").lower() == "true"

    # Deepgram STT
    DEEPGRAM_API_KEY: Optional[str] = os.getenv("DEEPGRAM_API_KEY")
    DEEPGRAM_SAMPLE_RATE: int = int(os.getenv("DEEPGRAM_SAMPLE_RATE", "48000"))
    DEEPGRAM_LANGUAGE: str = os.getenv("DEEPGRAM_LANGUAGE", "en-US")

    # HeyGen Avatar
    HEYGEN_API_KEY: Optional[str] = os.getenv("HEYGEN_API_KEY")
    HEYGEN_AVATAR_ID: str = os.getenv("HEYGEN_AVATAR_ID", "default")
    HEYGEN_VIDEO_QUALITY: str = os.getenv("HEYGEN_VIDEO_QUALITY", "LOW")

    # Next.js Webhook
    NEXTJS_WEBHOOK_URL: str = os.getenv(
        "NEXTJS_WEBHOOK_URL",
        "http://localhost:3000"
    )

    # Agent Settings
    AGENT_FPS: int = int(os.getenv("AGENT_FPS", "10"))
    AGENT_TIMEOUT: int = int(os.getenv("AGENT_TIMEOUT", "3600"))  # 1 hour
    PORT: int = int(os.getenv("PORT", "8080"))

    # Logging
    LOG_LEVEL_WEBRTC: str = os.getenv("LOG_LEVEL_WEBRTC", "WARNING")  # DEBUG to diagnose ICE/STUN issues

    @classmethod
    def validate(cls, force: bool = False) -> bool:
        """Validate required configuration.

        Args:
            force: If True, re-validate even if already validated (prints messages again)

        Returns:
            bool: True if configuration is valid
        """
        # Return cached result if already validated (avoid duplicate log messages)
        if cls._validated is not None and not force:
            return cls._validated

        # Always required
        required = [
            ("STREAM_API_KEY", cls.STREAM_API_KEY),
            ("API_SECRET_KEY", cls.API_SECRET_KEY),
        ]

        # Need at least one LLM
        has_llm = bool(cls.GEMINI_API_KEY or cls.OPENAI_API_KEY)
        if not has_llm:
            required.append(("GEMINI_API_KEY or OPENAI_API_KEY", None))

        # Deepgram only required when NOT using Realtime (which has built-in STT)
        uses_realtime = cls.GEMINI_USE_REALTIME or (cls.OPENAI_API_KEY and not cls.GEMINI_API_KEY)
        if not uses_realtime and not cls.DEEPGRAM_API_KEY:
            required.append(("DEEPGRAM_API_KEY", None))

        missing = [name for name, value in required if not value]

        if missing:
            print(f"❌ Missing required config: {', '.join(missing)}")
            cls._validated = False
            return False

        print("✅ Configuration validated")
        cls._validated = True
        return True


# Validate on import
if __name__ != "__main__":
    if not Config.validate():
        print("⚠️  Warning: Invalid configuration - some features may not work")
