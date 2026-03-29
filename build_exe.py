from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT / "dist"


def run(cmd: list[str]) -> None:
    print("[RUN]", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def main() -> None:
    npm = shutil.which("npm")
    if npm is None:
        raise RuntimeError("npm не найден. Установите Node.js и npm.")

    pyinstaller = shutil.which("pyinstaller")
    if pyinstaller is None:
        raise RuntimeError(
            "pyinstaller не найден. Установите его командой: pip install pyinstaller"
        )

    run([npm, "install"])
    run([npm, "run", "build"])

    if not FRONTEND_DIST.exists():
        raise RuntimeError("Папка dist не найдена после сборки фронтенда.")

    data_sep = ";" if sys.platform.startswith("win") else ":"
    add_data = f"dist{data_sep}dist"

    run(
        [
            pyinstaller,
            "--noconfirm",
            "--clean",
            "--onefile",
            "--windowed",
            "--name",
            "AssignmentOptimizer",
            "--add-data",
            add_data,
            "launcher.py",
        ]
    )

    exe_name = "AssignmentOptimizer.exe" if sys.platform.startswith("win") else "AssignmentOptimizer"
    print(f"Готово: {ROOT / 'dist' / exe_name}")


if __name__ == "__main__":
    main()
