"""
BharatGreen AI — 24-Hour Grid Carbon Forecast
===============================================
Produces the hour-by-hour carbon-intensity curve used by the Time-Shift
scheduler. Indian grids are cleanest ~2–5 AM (low industrial demand, base
hydro/nuclear share) and dirtiest at the morning & evening demand peaks.
"""

from __future__ import annotations

from data.regional_data import REGION_CATALOG
from models.schemas import GridForecastResponse, ForecastPoint

# Hourly multiplier applied to a region's base grid intensity (index = IST hour).
_HOUR_CURVE = [
    0.72, 0.68, 0.65, 0.63, 0.62, 0.64, 0.71, 0.84,
    0.95, 1.05, 1.10, 1.08, 1.04, 1.02, 1.00, 0.97,
    0.96, 0.98, 1.06, 1.12, 1.08, 0.98, 0.88, 0.78,
]


def build_forecast(region_id: str) -> GridForecastResponse:
    region = REGION_CATALOG[region_id]
    points = [
        ForecastPoint(hour_ist=h, intensity_g_co2=round(region.grid_intensity_g_co2 * m, 1))
        for h, m in enumerate(_HOUR_CURVE)
    ]
    best = min(points, key=lambda p: p.intensity_g_co2)
    worst = max(points, key=lambda p: p.intensity_g_co2)
    return GridForecastResponse(
        region=region_id,
        region_name=region.display_name,
        points=points,
        best_hour_ist=best.hour_ist,
        worst_hour_ist=worst.hour_ist,
        best_intensity_g_co2=best.intensity_g_co2,
        worst_intensity_g_co2=worst.intensity_g_co2,
        source="simulated",
    )
