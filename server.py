from __future__ import annotations

from pathlib import Path
import sys

from flask import Flask, jsonify, request, send_from_directory

from backend.solver import SolverError, solve_problem


def _resolve_dist_dir() -> Path:
    if getattr(sys, "frozen", False):
        meipass = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
        bundled_dist = meipass / "dist"
        if bundled_dist.exists():
            return bundled_dist

        dist_next_to_exe = Path(sys.executable).resolve().parent / "dist"
        if dist_next_to_exe.exists():
            return dist_next_to_exe

    return Path(__file__).resolve().parent / "dist"


DIST_DIR = _resolve_dist_dir()
app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path="")


@app.post("/api/solve")
def api_solve():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(solve_problem(payload))
    except SolverError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        return jsonify({"error": f"Внутренняя ошибка: {exc}"}), 500


@app.get("/")
def index():
    if DIST_DIR.exists():
        return send_from_directory(DIST_DIR, "index.html")
    return jsonify({"message": "Соберите фронтенд: npm install && npm run build"})


@app.get("/<path:path>")
def static_proxy(path: str):
    if DIST_DIR.exists() and (DIST_DIR / path).exists():
        return send_from_directory(DIST_DIR, path)
    if DIST_DIR.exists():
        return send_from_directory(DIST_DIR, "index.html")
    return index()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=False)
