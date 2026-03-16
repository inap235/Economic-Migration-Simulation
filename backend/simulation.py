from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np


STATES = np.array(["S", "I", "M", "R"])
STATE_TO_INDEX = {state: idx for idx, state in enumerate(STATES)}


@dataclass
class SimulationConfig:
    n_agents: int = 500
    steps: int = 50
    seed: int = 42

    # Network and tie strengths
    network_edge_prob: float = 0.03
    lambda_relative: float = 1.0
    lambda_facebook: float = 0.6
    lambda_tiktok: float = 0.35

    # Utility coefficients
    alpha_1: float = 1.0
    alpha_2: float = 0.6

    beta_1: float = 1.0
    beta_2: float = 1.0
    beta_3: float = 1.8
    beta_4: float = 1.2
    beta_5: float = 1.0
    beta_6: float = 1.1
    beta_7: float = 0.8

    # Logistic transition coefficients
    gamma_0: float = -1.2
    gamma_1: float = 1.4
    gamma_2: float = 1.1
    gamma_3: float = 1.0

    eta_0: float = -0.8
    eta_1: float = 0.9
    eta_2: float = 1.1
    eta_3: float = 1.0

    # Macro diffusion values for reference series
    p0: float = 0.02
    q0: float = 0.12
    r: float = 0.06
    kappa_1: float = 0.05
    kappa_2: float = 0.04
    kappa_3: float = 0.07
    kappa_4: float = 0.05

    # Base distributions (means and std)
    wage_local_mean: float = 700.0
    wage_local_std: float = 90.0
    wage_external_mean: float = 1900.0
    wage_external_std: float = 260.0
    migration_cost_mean: float = 420.0
    migration_cost_std: float = 100.0

    pressure_mean: float = 0.45
    pressure_std: float = 0.2

    theta_mean: float = 0.2
    theta_std: float = 0.5

    optimism_delta_mean: float = 0.16
    optimism_delta_std: float = 0.06

    home_attachment_mean: float = 0.55
    home_attachment_std: float = 0.2
    abroad_adaptation_mean: float = 0.45
    abroad_adaptation_std: float = 0.2

    media_facebook_mean: float = 0.55
    media_tiktok_mean: float = 0.45

    # Initial state fractions
    initial_intent_fraction: float = 0.05
    initial_migrated_fraction: float = 0.02


def logistic(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _clip01(values: np.ndarray) -> np.ndarray:
    return np.clip(values, 0.0, 1.0)


def _positive(values: np.ndarray, minimum: float = 1e-6) -> np.ndarray:
    return np.clip(values, minimum, None)


def _build_adjacency_and_weights(cfg: SimulationConfig, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    n = cfg.n_agents
    adjacency = (rng.random((n, n)) < cfg.network_edge_prob).astype(float)
    adjacency = np.triu(adjacency, k=1)
    adjacency = adjacency + adjacency.T
    np.fill_diagonal(adjacency, 0.0)

    rel_prob = 0.22
    fb_prob = 0.48

    rel_mask = (rng.random((n, n)) < rel_prob).astype(float)
    fb_mask = ((rng.random((n, n)) < fb_prob).astype(float)) * (1.0 - rel_mask)
    tk_mask = 1.0 - np.clip(rel_mask + fb_mask, 0.0, 1.0)

    rel_mask = np.triu(rel_mask, k=1)
    fb_mask = np.triu(fb_mask, k=1)
    tk_mask = np.triu(tk_mask, k=1)

    rel_mask = rel_mask + rel_mask.T
    fb_mask = fb_mask + fb_mask.T
    tk_mask = tk_mask + tk_mask.T

    weights = (
        cfg.lambda_relative * rel_mask
        + cfg.lambda_facebook * fb_mask
        + cfg.lambda_tiktok * tk_mask
    )
    weights = weights * adjacency

    return adjacency, weights


def _initialize_agents(cfg: SimulationConfig, rng: np.random.Generator) -> Dict[str, np.ndarray]:
    n = cfg.n_agents

    w_local = _positive(rng.normal(cfg.wage_local_mean, cfg.wage_local_std, n))
    w_external = _positive(rng.normal(cfg.wage_external_mean, cfg.wage_external_std, n))
    cost = _positive(rng.normal(cfg.migration_cost_mean, cfg.migration_cost_std, n))

    pressure = _clip01(rng.normal(cfg.pressure_mean, cfg.pressure_std, n))
    theta = rng.normal(cfg.theta_mean, cfg.theta_std, n)

    delta_opt = _positive(rng.normal(cfg.optimism_delta_mean, cfg.optimism_delta_std, n), minimum=0.0)
    b_opt = delta_opt

    f_home = _clip01(rng.normal(cfg.home_attachment_mean, cfg.home_attachment_std, n))
    a_abroad = _clip01(rng.normal(cfg.abroad_adaptation_mean, cfg.abroad_adaptation_std, n))

    media_fb = _clip01(rng.normal(cfg.media_facebook_mean, 0.2, n))
    media_tk = _clip01(rng.normal(cfg.media_tiktok_mean, 0.2, n))

    states = np.full(n, "S", dtype="<U1")

    idx = np.arange(n)
    rng.shuffle(idx)

    n_intent = int(cfg.initial_intent_fraction * n)
    n_migrated = int(cfg.initial_migrated_fraction * n)

    intent_idx = idx[:n_intent]
    migrated_idx = idx[n_intent : n_intent + n_migrated]

    states[intent_idx] = "I"
    states[migrated_idx] = "M"

    return {
        "w_local": w_local,
        "w_external": w_external,
        "cost": cost,
        "pressure": pressure,
        "theta": theta,
        "b_opt": b_opt,
        "f_home": f_home,
        "a_abroad": a_abroad,
        "media_fb": media_fb,
        "media_tk": media_tk,
        "states": states,
    }


def run_simulation(cfg: SimulationConfig) -> Dict[str, object]:
    rng = np.random.default_rng(cfg.seed)

    adjacency, weights = _build_adjacency_and_weights(cfg, rng)
    agents = _initialize_agents(cfg, rng)

    w_local = agents["w_local"]
    w_external = agents["w_external"]
    cost = agents["cost"]
    pressure = agents["pressure"]
    theta = agents["theta"]
    b_opt = agents["b_opt"]
    f_home = agents["f_home"]
    a_abroad = agents["a_abroad"]
    media_fb = agents["media_fb"]
    media_tk = agents["media_tk"]
    states = agents["states"]

    hist: List[Dict[str, float]] = []
    macro_m: List[float] = []

    for t in range(cfg.steps + 1):
        in_i_or_m = np.isin(states, ["I", "M"]).astype(float)

        weighted_neighbors = weights @ in_i_or_m
        norm_weights = np.sum(weights, axis=1)
        with np.errstate(divide="ignore", invalid="ignore"):
            network_influence = np.where(norm_weights > 0.0, weighted_neighbors / norm_weights, 0.0)

        diaspora = float(np.mean(states == "M"))
        diaspora_i = np.full(cfg.n_agents, diaspora)

        observed_total = rng.integers(8, 28, size=cfg.n_agents)
        positive_ratio = np.clip(
            0.25
            + 0.55 * diaspora_i
            + 0.15 * media_fb
            + 0.1 * media_tk
            + rng.normal(0.0, 0.08, size=cfg.n_agents),
            0.0,
            1.0,
        )
        observed_positive = np.round(observed_total * positive_ratio)
        b_surv = observed_positive / np.maximum(observed_total, 1)

        media_influence = 0.6 * media_fb + 0.4 * media_tk
        p_loss = pressure * (0.3 + 0.7 * network_influence)

        w_external_perc = w_external * (1.0 + b_opt)

        u_stay = cfg.alpha_1 * w_local - cfg.alpha_2 * p_loss
        u_mig = (
            cfg.beta_1 * w_external_perc
            - cfg.beta_2 * cost
            + cfg.beta_3 * network_influence
            + cfg.beta_4 * diaspora_i
            + cfg.beta_5 * media_influence
            + cfg.beta_6 * b_surv
            + cfg.beta_7 * b_opt
        )
        delta_u = u_mig - u_stay

        p_s_to_i = logistic(delta_u - theta)
        z_i_to_m = (
            cfg.gamma_0
            + cfg.gamma_1 * delta_u / 1000.0
            + cfg.gamma_2 * network_influence
            + cfg.gamma_3 * diaspora_i
        )
        p_i_to_m = logistic(z_i_to_m)

        z_m_to_r = (
            cfg.eta_0
            - cfg.eta_1 * (w_external - w_local) / 1000.0
            + cfg.eta_2 * f_home
            - cfg.eta_3 * a_abroad
        )
        p_m_to_r = logistic(z_m_to_r)

        if t < cfg.steps:
            draws = rng.random(cfg.n_agents)

            s_mask = states == "S"
            i_mask = states == "I"
            m_mask = states == "M"

            to_i = s_mask & (draws < p_s_to_i)
            states[to_i] = "I"

            draws = rng.random(cfg.n_agents)
            to_m = i_mask & (draws < p_i_to_m)
            states[to_m] = "M"

            draws = rng.random(cfg.n_agents)
            to_r = m_mask & (draws < p_m_to_r)
            states[to_r] = "R"

        counts = {state: int(np.sum(states == state)) for state in STATES}
        hist.append(
            {
                "t": t,
                "S": counts["S"],
                "I": counts["I"],
                "M": counts["M"],
                "R": counts["R"],
                "m_share": (counts["I"] + counts["M"]) / cfg.n_agents,
                "diaspora_share": counts["M"] / cfg.n_agents,
                "mean_network_influence": float(np.mean(network_influence)),
                "mean_delta_u": float(np.mean(delta_u)),
                "mean_b_surv": float(np.mean(b_surv)),
                "mean_b_opt": float(np.mean(b_opt)),
            }
        )

        if t == 0:
            macro_m.append(hist[-1]["m_share"])
        else:
            prev_m = macro_m[-1]
            p = cfg.p0 + cfg.kappa_1 * float(np.mean(b_surv)) + cfg.kappa_2 * float(np.mean(b_opt))
            q = cfg.q0 + cfg.kappa_3 * float(np.mean(media_fb)) + cfg.kappa_4 * float(np.mean(media_tk))
            dm = p * (1.0 - prev_m) + q * prev_m * (1.0 - prev_m) - cfg.r * prev_m
            macro_m.append(float(np.clip(prev_m + dm, 0.0, 1.0)))

    final_counts = {state: int(np.sum(states == state)) for state in STATES}

    return {
        "config": cfg.__dict__,
        "history": hist,
        "macro_diffusion": [{"t": i, "m": m_val} for i, m_val in enumerate(macro_m)],
        "final_counts": final_counts,
        "summary": {
            "final_migration_share": (final_counts["I"] + final_counts["M"]) / cfg.n_agents,
            "final_diaspora_share": final_counts["M"] / cfg.n_agents,
            "avg_local_wage": float(np.mean(w_local)),
            "avg_external_wage": float(np.mean(w_external)),
            "avg_migration_cost": float(np.mean(cost)),
        },
    }
