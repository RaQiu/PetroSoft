from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from api.health import router as health_router
from api.workarea import router as workarea_router
from api.data import router as data_router
from api.export import router as export_router
from api.well import router as well_router
from api.processing import router as processing_router
from api.calculator import router as calculator_router

app = FastAPI(title="PetroSoft API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(workarea_router, prefix="/api")
app.include_router(data_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(well_router, prefix="/api")
app.include_router(processing_router, prefix="/api")
app.include_router(calculator_router, prefix="/api")
