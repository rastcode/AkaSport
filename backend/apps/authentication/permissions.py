"""
Role-Based Access Control (RBAC) permission classes.

These DRF permissions read the `role` attribute (and convenience properties)
on `CustomUser` to enforce the OWNER > ADMIN > CUSTOMER hierarchy at the view
and object level.
"""

from __future__ import annotations

from typing import Any

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView


class _AuthenticatedBase(permissions.BasePermission):
    """Shared helper: require an authenticated, active user first."""

    @staticmethod
    def _user_ok(request: Request) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_active)


class IsOwner(_AuthenticatedBase):
    """Allow access only to users with the OWNER role."""

    message = "Only an Owner may perform this action."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return self._user_ok(request) and request.user.is_owner


class IsAdmin(_AuthenticatedBase):
    """
    Allow access to ADMIN or OWNER roles.

    OWNER is intentionally a superset of ADMIN, so owners pass admin gates.
    """

    message = "Admin privileges are required for this action."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return self._user_ok(request) and request.user.is_admin


class IsCustomer(_AuthenticatedBase):
    """Allow access only to users with the CUSTOMER role."""

    message = "This action is restricted to customers."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return self._user_ok(request) and request.user.is_customer


class IsOwnerOrReadOnly(_AuthenticatedBase):
    """
    Object-level permission for sensitive resources.

    * Safe (read-only) methods are allowed for any authenticated user.
    * Write methods require either the platform OWNER role, or that the
      requesting user owns the object.

    Object ownership is detected via a `user`/`owner`/`created_by` FK, or by
    the object being the user record itself.
    """

    message = "You do not have permission to modify this resource."

    def has_permission(self, request: Request, view: APIView) -> bool:
        # Authenticated users may proceed to object-level checks.
        return self._user_ok(request)

    def has_object_permission(
        self, request: Request, view: APIView, obj: Any
    ) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if user.is_owner:
            return True

        # Resolve the object's owner across common attribute names.
        for attr in ("user", "owner", "created_by"):
            related = getattr(obj, attr, None)
            if related is not None:
                return related == user

        # The object may itself be the user record (e.g. profile editing).
        return obj == user
