from __future__ import annotations

import socket
import threading
import time
import webbrowser

from waitress import serve

from server import app

HOST = "127.0.0.1"
PORT = 8080
URL = f"http://{HOST}:{PORT}"


def _open_browser_when_ready(timeout_seconds: float = 20.0, check_interval: float = 0.2) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(check_interval)
            if sock.connect_ex((HOST, PORT)) == 0:
                webbrowser.open(URL)
                return
        time.sleep(check_interval)


def main() -> None:
    threading.Thread(target=_open_browser_when_ready, daemon=True).start()
    serve(app, host=HOST, port=PORT, threads=8)


if __name__ == "__main__":
    main()
