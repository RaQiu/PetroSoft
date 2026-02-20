import os

# Server config
HOST = os.getenv("PETROSOFT_HOST", "127.0.0.1")
PORT = int(os.getenv("PETROSOFT_PORT", "20022"))
DEBUG = os.getenv("PETROSOFT_DEBUG", "true").lower() == "true"

# CORS
CORS_ORIGINS = [
    "http://localhost:20012",
    "http://127.0.0.1:20012",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
