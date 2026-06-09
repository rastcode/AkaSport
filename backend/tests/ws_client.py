#!/usr/bin/env python
"""
Standalone WebSocket test client for the AkaSport chat support system.

Connects to the chat consumer using a JWT access token, sends a message, and
logs every inbound frame in real time. Requires only the `websockets` package
(`pip install websockets`); it does NOT import Django, so it can be run from
anywhere against a running server.

Usage:
    # 1) Start Redis + the ASGI dev server (see Part 4 README).
    # 2) Obtain an access token, e.g.:
    #    curl -X POST http://127.0.0.1:8000/api/auth/login/ \
    #         -H "Content-Type: application/json" \
    #         -d '{"identifier":"customer@example.com","password":"StrongPass9"}'
    # 3) Run this client:
    python tests/ws_client.py --token "<ACCESS_TOKEN>" --message "Hello support!"

    # Admin joining a specific room:
    python tests/ws_client.py --token "<ADMIN_TOKEN>" --room 1 \
        --message "Hi, how can I help?"
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime
from typing import Optional

try:
    import websockets
    from websockets.exceptions import ConnectionClosed, InvalidStatusCode
except ImportError:  # pragma: no cover
    sys.exit("Missing dependency. Install it with:  pip install websockets")


def _log(direction: str, payload: object) -> None:
    stamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{stamp}] {direction} {payload}")


def build_uri(host: str, port: int, token: str, room: Optional[int]) -> str:
    base = f"ws://{host}:{port}/ws/chat/"
    if room is not None:
        base = f"ws://{host}:{port}/ws/chat/{room}/"
    return f"{base}?token={token}"


async def listener(ws: "websockets.WebSocketClientProtocol") -> None:
    """Continuously print inbound frames."""
    try:
        async for raw in ws:
            try:
                _log("<-- RECV", json.loads(raw))
            except json.JSONDecodeError:
                _log("<-- RECV(raw)", raw)
    except ConnectionClosed as exc:
        _log("xx CLOSED", f"code={exc.code} reason={exc.reason!r}")


async def run(args: argparse.Namespace) -> None:
    uri = build_uri(args.host, args.port, args.token, args.room)
    _log("--> CONNECT", uri)

    try:
        async with websockets.connect(uri, ping_interval=20) as ws:
            _log("==  OPEN", "connection established")

            # Background task: listen for broadcasts.
            listen_task = asyncio.create_task(listener(ws))

            # Send the initial message.
            if args.message:
                frame = json.dumps({"message": args.message})
                await ws.send(frame)
                _log("--> SEND", frame)

            if args.interactive:
                await _interactive_loop(ws)
            else:
                # Stay open briefly to capture the echo/broadcast.
                await asyncio.sleep(args.wait)

            listen_task.cancel()
    except InvalidStatusCode as exc:
        _log("xx HANDSHAKE FAILED", f"HTTP {exc.status_code} (check your token)")
    except OSError as exc:
        _log("xx CONNECT ERROR", str(exc))


async def _interactive_loop(ws: "websockets.WebSocketClientProtocol") -> None:
    """Read lines from stdin and send each as a chat message."""
    loop = asyncio.get_event_loop()
    print("Type messages (blank line or Ctrl-D to quit):")
    while True:
        line = await loop.run_in_executor(None, sys.stdin.readline)
        if not line or not line.strip():
            break
        frame = json.dumps({"message": line.strip()})
        await ws.send(frame)
        _log("--> SEND", frame)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AkaSport chat WS test client")
    parser.add_argument("--token", required=True, help="JWT access token")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--room", type=int, default=None, help="Room id (required for admins)"
    )
    parser.add_argument("--message", default="Hello from the test client!")
    parser.add_argument(
        "--wait", type=float, default=3.0, help="Seconds to listen before exiting"
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Read messages from stdin and stream them",
    )
    return parser.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(run(parse_args()))
    except KeyboardInterrupt:
        print("\nInterrupted.")
