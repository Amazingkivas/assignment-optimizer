from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy.optimize import linear_sum_assignment


class SolverError(ValueError):
    """Raised when payload is invalid."""


@dataclass
class ParsedInput:
    n: int
    k: int
    c: np.ndarray
    d: np.ndarray
    b: np.ndarray
    lambda0: np.ndarray
    max_iter: int
    eps: float
    step_mode: str
    step_const: float


def _as_square(name: str, value: Any, n: int) -> np.ndarray:
    arr = np.asarray(value, dtype=float)
    if arr.shape != (n, n):
        raise SolverError(f"{name} должна иметь размер {n}x{n}.")
    return arr


def _parse(payload: dict[str, Any]) -> ParsedInput:
    try:
        n = int(payload.get("n", 0))
        k = int(payload.get("k", 0))
    except (TypeError, ValueError) as exc:
        raise SolverError("n и k должны быть целыми числами.") from exc

    if n <= 0 or k <= 0:
        raise SolverError("n и k должны быть больше 0.")

    c = _as_square("C", payload.get("c"), n)

    d_raw = payload.get("d")
    d = np.asarray(d_raw, dtype=float)
    if d.shape != (k, n, n):
        raise SolverError(f"D должна иметь размер {k}x{n}x{n}.")

    b = np.asarray(payload.get("b"), dtype=float)
    if b.shape != (k,):
        raise SolverError(f"b должен быть вектором длины {k}.")

    lambda0 = np.asarray(payload.get("lambda0", [0.0] * k), dtype=float)
    if lambda0.shape != (k,):
        raise SolverError(f"lambda0 должен быть вектором длины {k}.")

    max_iter = int(payload.get("max_iter", 200))
    eps = float(payload.get("eps", 1e-6))
    step_mode = str(payload.get("step_mode", "harmonic"))
    step_const = float(payload.get("step_const", 0.1))
    if step_mode not in {"harmonic", "constant"}:
        raise SolverError("step_mode: harmonic или constant.")
    if step_const <= 0:
        raise SolverError("step_const должен быть > 0.")

    return ParsedInput(n, k, c, d, b, lambda0, max_iter, eps, step_mode, step_const)


def solve_problem(payload: dict[str, Any]) -> dict[str, Any]:
    p = _parse(payload)

    lamb = p.lambda0.astype(float).copy()
    history: list[dict[str, Any]] = []

    best_cost = float("inf")
    best_assignment: list[int] = []
    best_subgradient: list[float] = []
    best_iter = 0

    for it in range(p.max_iter + 1):
        g = p.c + np.tensordot(lamb, p.d, axes=(0, 0))
        rows, cols = linear_sum_assignment(g)

        x = np.zeros((p.n, p.n), dtype=float)
        x[rows, cols] = 1.0

        objective = float(np.sum(p.c * x))
        subgradient = np.array([float(np.sum(p.d[idx] * x) - p.b[idx]) for idx in range(p.k)])
        norm = float(np.linalg.norm(subgradient))

        feasible = bool(np.all(subgradient <= 1e-9))
        if feasible and objective < best_cost:
            best_cost = objective
            best_assignment = cols.tolist()
            best_subgradient = subgradient.tolist()
            best_iter = it

        history.append(
            {
                "iter": it,
                "lambda": lamb.tolist(),
                "assignment": cols.tolist(),
                "objective": objective,
                "subgradient": subgradient.tolist(),
                "subgradient_norm": norm,
                "feasible": feasible,
            }
        )

        if norm <= p.eps or it >= p.max_iter:
            break

        step = p.step_const if p.step_mode == "constant" else 1.0 / (it + 1)
        lamb = np.maximum(0.0, lamb + step * subgradient)

    if not best_assignment:
        best_row = min(history, key=lambda item: (item["subgradient_norm"], item["objective"]))
        best_assignment = best_row["assignment"]
        best_cost = best_row["objective"]
        best_subgradient = best_row["subgradient"]
        best_iter = best_row["iter"]

    return {
        "best_assignment_zero_based": best_assignment,
        "best_assignment_one_based": [value + 1 for value in best_assignment],
        "best_objective": best_cost,
        "best_subgradient": best_subgradient,
        "best_iteration": best_iter,
        "iterations_done": history[-1]["iter"],
        "history": history,
    }
