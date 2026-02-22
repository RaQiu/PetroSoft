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


class TimeDepthPoint(BaseModel):
    well_name: str
    depth: float
    time: float


class WellAttribute(BaseModel):
    well_name: str
    attribute_name: str
    attribute_value: str


class WellResponse(BaseModel):
    id: int
    name: str
    x: Optional[float] = None
    y: Optional[float] = None
    kb: Optional[float] = None
    td: Optional[float] = None


class SeismicVolume(BaseModel):
    id: int
    name: str
    file_path: str
    n_inlines: Optional[int] = None
    n_crosslines: Optional[int] = None
    n_samples: Optional[int] = None
    sample_interval: Optional[float] = None
    inline_min: Optional[int] = None
    inline_max: Optional[int] = None
    crossline_min: Optional[int] = None
    crossline_max: Optional[int] = None
    format_code: Optional[int] = None


class SeismicImportRequest(BaseModel):
    file_path: str
    name: str
    workarea_path: str
