from __future__ import annotations

from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulation import SimulationConfig, run_simulation


class SimulationRequest(BaseModel):
    n_agents: int = Field(default=500, ge=50, le=5000)
    steps: int = Field(default=60, ge=10, le=300)
    seed: int = Field(default=42, ge=0)

    wage_local_mean: float = Field(default=700.0, gt=0)
    wage_external_mean: float = Field(default=1900.0, gt=0)
    migration_cost_mean: float = Field(default=420.0, gt=0)

    network_edge_prob: float = Field(default=0.03, gt=0.001, lt=0.5)

    media_facebook_mean: float = Field(default=0.55, ge=0.0, le=1.0)
    media_tiktok_mean: float = Field(default=0.45, ge=0.0, le=1.0)

    initial_intent_fraction: float = Field(default=0.05, ge=0.0, le=0.5)
    initial_migrated_fraction: float = Field(default=0.02, ge=0.0, le=0.5)

    optimism_delta_mean: float = Field(default=0.16, ge=0.0, le=1.0)

    beta_3: Optional[float] = Field(default=None, ge=0.0)
    beta_4: Optional[float] = Field(default=None, ge=0.0)
    beta_5: Optional[float] = Field(default=None, ge=0.0)


app = FastAPI(title="Economic Migration Simulation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/simulate")
def simulate(payload: SimulationRequest) -> dict:
    cfg = SimulationConfig(
        n_agents=payload.n_agents,
        steps=payload.steps,
        seed=payload.seed,
        wage_local_mean=payload.wage_local_mean,
        wage_external_mean=payload.wage_external_mean,
        migration_cost_mean=payload.migration_cost_mean,
        network_edge_prob=payload.network_edge_prob,
        media_facebook_mean=payload.media_facebook_mean,
        media_tiktok_mean=payload.media_tiktok_mean,
        initial_intent_fraction=payload.initial_intent_fraction,
        initial_migrated_fraction=payload.initial_migrated_fraction,
        optimism_delta_mean=payload.optimism_delta_mean,
        beta_3=payload.beta_3 if payload.beta_3 is not None else SimulationConfig.beta_3,
        beta_4=payload.beta_4 if payload.beta_4 is not None else SimulationConfig.beta_4,
        beta_5=payload.beta_5 if payload.beta_5 is not None else SimulationConfig.beta_5,
    )
    return run_simulation(cfg)
