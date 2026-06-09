"""
Audit-log request context middleware.

Django model signals (post_save/post_delete) don't know *who* triggered a
change. This middleware stashes the acting request's user and IP in a
thread-local for the lifetime of the request, so the audit signal handlers in
`apps.analytics.signals` can attribute changes to the correct admin/owner.

The thread-local is always cleared at the end of the request to prevent leakage
across the worker thread's next request.
"""

from __future__ import annotations

import threading
from typing import Any, Callable, Optional

from django.http import HttpRequest, HttpResponse

# Thread-local storage holding the current request's audit context.
_audit_context = threading.local()


def get_current_user() -> Optional[Any]:
    """Return the user acting in the current request thread, if any."""
    return getattr(_audit_context, "user", None)


def get_current_ip() -> Optional[str]:
    """Return the client IP for the current request thread, if any."""
    return getattr(_audit_context, "ip", None)


def set_audit_context(user: Any = None, ip: Optional[str] = None) -> None:
    """Manually set context (useful for management commands / Celery tasks)."""
    _audit_context.user = user
    _audit_context.ip = ip


def clear_audit_context() -> None:
    """Reset the thread-local. Always called at request teardown."""
    for attr in ("user", "ip"):
        if hasattr(_audit_context, attr):
            delattr(_audit_context, attr)


def _client_ip(request: HttpRequest) -> Optional[str]:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AuditLogMiddleware:
    """Populate the per-request audit context for signal-based logging."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        user = getattr(request, "user", None)
        set_audit_context(user=user, ip=_client_ip(request))
        try:
            response = self.get_response(request)
        finally:
            # Critical: clear even if the view raises, to avoid cross-request leaks.
            clear_audit_context()
        return response
