"""
Authentication backend that accepts either email or phone number.

Django's default `ModelBackend` only knows about `USERNAME_FIELD`. Since our
users may log in with either identifier, this backend resolves the credential
against both `email` and `phone_number`.
"""

from __future__ import annotations

from typing import Any, Optional

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from django.http import HttpRequest

User = get_user_model()


class MultiFieldModelBackend(ModelBackend):
    """Authenticate against email OR phone number + password."""

    def authenticate(
        self,
        request: Optional[HttpRequest],
        username: Optional[str] = None,
        password: Optional[str] = None,
        **kwargs: Any,
    ) -> Optional[Any]:
        # Allow callers to pass the identifier as `email`, `phone_number`,
        # or the generic `username`.
        identifier = (
            username
            or kwargs.get("email")
            or kwargs.get("phone_number")
        )
        if identifier is None or password is None:
            return None

        try:
            user = User.objects.get(
                Q(email__iexact=identifier) | Q(phone_number=identifier)
            )
        except User.DoesNotExist:
            # Run the default hasher once to mitigate timing attacks that
            # could enumerate valid identifiers.
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            user = (
                User.objects.filter(
                    Q(email__iexact=identifier) | Q(phone_number=identifier)
                )
                .order_by("id")
                .first()
            )
            if user is None:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
