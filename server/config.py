import os

# Server config
HOST = os.getenv("PETROSOFT_HOST", "127.0.0.1")
PORT = int(os.getenv("PETROSOFT_PORT", "20022"))
DEBUG = os.getenv("PETROSOFT_DEBUG", "true").lower() == "true"

# CORS — allow both dev servers and production file:// origin
CORS_ORIGINS = [
    "http://localhost:20012",
    "http://127.0.0.1:20012",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Production: Electron loads from file:// but sends origin as null or app://
    # Allow all localhost ports for dynamic port allocation
    "http://localhost:*",
    "http://127.0.0.1:*",
]

# In production, also accept requests with no Origin header (file:// protocol)
CORS_ALLOW_ALL = not DEBUG
