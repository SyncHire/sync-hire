"""
Configuration management for SyncHire AI Agent
Loads environment variables and validates settings
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Config:
    """Application configuration"""

    # Stream Video
    STREAM_API_KEY: str = os.getenv("STREAM_API_KEY", "")
    STREAM_API_SECRET: Optional[str] = os.getenv("STREAM_API_SECRET")

    # OpenAI
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-realtime-preview")

    # Alternative: Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # HeyGen Avatar
    HEYGEN_API_KEY: Optional[str] = os.getenv("HEYGEN_API_KEY")
    HEYGEN_AVATAR_ID: str = os.getenv("HEYGEN_AVATAR_ID", "default")
    HEYGEN_VIDEO_QUALITY: str = os.getenv("HEYGEN_VIDEO_QUALITY", "LOW")

    # ElevenLabs (TTS)
    ELEVENLABS_API_KEY: Optional[str] = os.getenv("ELEVENLABS_API_KEY")
    ELEVENLABS_VOICE_ID: str = os.getenv(
        "ELEVENLABS_VOICE_ID",
        "21m00Tcm4TlvDq8ikWAM"  # Default professional voice
    )

    # Next.js Webhook
    NEXTJS_WEBHOOK_URL: str = os.getenv(
        "NEXTJS_WEBHOOK_URL",
        "http://localhost:3000"
    )

    # Agent Settings
    AGENT_FPS: int = int(os.getenv("AGENT_FPS", "10"))
    AGENT_TIMEOUT: int = int(os.getenv("AGENT_TIMEOUT", "3600"))  # 1 hour
    PORT: int = int(os.getenv("PORT", "8080"))

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        required = [
            ("STREAM_API_KEY", cls.STREAM_API_KEY),
            ("OPENAI_API_KEY", cls.OPENAI_API_KEY),
            ("NEXTJS_WEBHOOK_URL", cls.NEXTJS_WEBHOOK_URL)
        ]

        missing = [name for name, value in required if not value]

        if missing:
            print(f"❌ Missing required config: {', '.join(missing)}")
            return False

        print("✅ Configuration validated")
        return True


# Validate on import
if __name__ != "__main__":
    if not Config.validate():
        print("⚠️  Warning: Invalid configuration - some features may not work")
