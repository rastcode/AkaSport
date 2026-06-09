"""
Root ASGI configuration for the AkaSport backend.

`ProtocolTypeRouter` dispatches by protocol:
    * "http"      -> the standard Django ASGI application (views, DRF, admin).
    * "websocket" -> Channels `URLRouter`, wrapped in our JWT auth middleware
                     and `AllowedHostsOriginValidator` (CSRF/origin protection
                     for WebSocket upgrades).

Importing Django and calling `get_asgi_application()` *before* importing any
module that touches the ORM is required so the app registry is ready.
"""

from __future__ import annotations

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialise Django (populates the app registry) before importing consumers.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from apps.chat.middleware import JWTAuthMiddlewareStack  # noqa: E402
from apps.chat.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
