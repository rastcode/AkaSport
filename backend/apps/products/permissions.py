"""
Catalog permissions, composed from the Part 1 RBAC primitives.

Public users may read; only ADMIN or OWNER roles may write.
"""

from __future__ import annotations

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.authentication.permissions import IsAdmin


class ReadOnlyOrIsAdmin(permissions.BasePermission):
    """
    Allow safe methods for everyone; restrict writes to ADMIN/OWNER.

    `IsAdmin` already treats OWNER as a superset of ADMIN (see Part 1), so this
    single class covers the "IsAdmin or IsOwner" requirement.
    """

    message = "Only Admins or the Owner may modify catalog resources."

    def has_permission(self, request: Request, view: APIView) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return IsAdmin().has_permission(request, view)

    def has_object_permission(
        self, request: Request, view: APIView, obj: object
    ) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return IsAdmin().has_permission(request, view)
