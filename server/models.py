"""Pydantic models for PetroSoft data types."""

from pydantic import BaseModel
from typing import Optional


class Well(BaseModel):
    name: str
    x: Optional[float] = None
    y: Optional[float] = None
    kb: Optional[float] = None
    td: Optional[float] = None


class TrajectoryPoint(BaseModel):
    depth: float
    inclination: float
    azimuth: float


class CurveInfo(BaseModel):
    name: str
    unit: str = ""
    sample_interval: float = 0.125


class CurveDataPoint(BaseModel):
    depth: float
    value: Optional[float] = None


class Layer(BaseModel):
    well_name: str
    formation: str
    top_depth: float
    bottom_depth: float


class LithologyEntry(BaseModel):
    well_name: str
    top_depth: float
    bottom_depth: float
    description: str


class InterpretationEntry(BaseModel):
    well_name: str
    top_depth: float
    bottom_depth: float
    conclusion: str
    category: str = ""


class DiscreteCurvePoint(BaseModel):
    depth: float
    value: Optional[float] = None


class WellResponse(BaseModel):
    id: int
    name: str
    x: Optional[float] = None
    y: Optional[float] = None
    kb: Optional[float] = None
    td: Optional[float] = None
