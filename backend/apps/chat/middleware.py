"""
Custom ASGI authentication middleware for WebSocket connections.

WebSocket handshakes cannot carry an `Authorization` header reliably from
browsers, so the JWT access token is passed via the query string:

    ws://127.0.0.1:8000/ws/chat/?token=<JWT_ACCESS_TOKEN>

`JWTAuthMiddleware` extracts and validates the token using SimpleJWT, resolves
the user, and assigns it to `scope["user"]`. Invalid/expired/missing tokens
yield an `AnonymousUser`; the consumer rejects the connection in `connect()`.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Optional
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

Scope = dict[str, Any]
Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]

User = get_user_model()


@database_sync_to_async
def get_user_from_token(raw_token: str):
    """
    Validate a JWT access token and return the associated active user.

    Returns `AnonymousUser` for any validation failure (bad signature,
    expiry, unknown user, inactive account).
    """
    try:
        validated = AccessToken(raw_token)
    except (InvalidToken, TokenError, Exception):
        return AnonymousUser()

    user_id = validated.get("user_id")
    if user_id is None:
        return AnonymousUser()

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

    if not user.is_active:
        return AnonymousUser()
    return user


def _extract_token(scope: Scope) -> Optional[str]:
    """Pull the `token` parameter from the WebSocket query string."""
    query_string = scope.get("query_string", b"")
    if isinstance(query_string, bytes):
        query_string = query_string.decode("utf-8", errors="ignore")
    params = parse_qs(query_string)
    token_list = params.get("token") or params.get("access_token")
    if token_list:
        return token_list[0]

    # Fallback: a `Bearer` header, if a non-browser client supplies one.
    for header_name, header_value in scope.get("headers", []):
        if header_name == b"authorization":
            value = header_value.decode("utf-8", errors="ignore")
            if value.lower().startswith("bearer "):
                return value.split(" ", 1)[1].strip()
    return None


class JWTAuthMiddleware(BaseMiddleware):
    """ASGI middleware that authenticates WebSocket scopes via JWT."""

    async def __call__(
        self, scope: Scope, receive: Receive, send: Send
    ) -> Any:
        # Copy scope to avoid mutating shared state across connections.
        scope = dict(scope)
        raw_token = _extract_token(scope)

        if raw_token:
            scope["user"] = await get_user_from_token(raw_token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner: Any) -> JWTAuthMiddleware:
    """
    Convenience wrapper mirroring Channels' `AuthMiddlewareStack` naming.

    Kept as a thin function so the ASGI config reads cleanly and additional
    middleware (e.g. logging) can be layered here later.
    """
    return JWTAuthMiddleware(inner)
