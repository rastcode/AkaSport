"""
Custom user manager (phone-first).

Identity for this Persian e-commerce platform is the **phone number**
(`USERNAME_FIELD`). Email is optional but unique when provided. This manager
re-implements `create_user` / `create_superuser` around that identity.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Optional

from django.contrib.auth.base_user import BaseUserManager
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

if TYPE_CHECKING:
    from apps.authentication.models import CustomUser


class CustomUserManager(BaseUserManager):
    """Manager keyed on `phone_number` with an optional unique `email`."""

    use_in_migrations = True

    # ------------------------------------------------------------------ #
    # Internal helper
    # ------------------------------------------------------------------ #
    def _create_user(
        self,
        phone_number: Optional[str],
        password: Optional[str],
        email: Optional[str] = None,
        **extra_fields: Any,
    ) -> "CustomUser":
        """Create and persist a user. `phone_number` is mandatory."""
        if not phone_number:
            raise ValueError(_("A phone number is required."))

        phone_number = phone_number.strip()
        email = self.normalize_email(email) if email else None

        user: "CustomUser" = self.model(
            phone_number=phone_number,
            email=email,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            # Phone/OTP-only accounts never set a usable password.
            user.set_unusable_password()
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def create_user(
        self,
        phone_number: Optional[str] = None,
        password: Optional[str] = None,
        email: Optional[str] = None,
        **extra_fields: Any,
    ) -> "CustomUser":
        """Create a regular CUSTOMER user (the default role)."""
        from apps.authentication.models import CustomUser

        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", CustomUser.Role.CUSTOMER)
        return self._create_user(phone_number, password, email, **extra_fields)

    def create_superuser(
        self,
        phone_number: Optional[str] = None,
        password: Optional[str] = None,
        email: Optional[str] = None,
        **extra_fields: Any,
    ) -> "CustomUser":
        """Create an OWNER superuser (enforces staff/superuser/OWNER)."""
        from apps.authentication.models import CustomUser

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", CustomUser.Role.OWNER)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        if extra_fields.get("role") != CustomUser.Role.OWNER:
            raise ValueError(_("Superuser must have role=OWNER."))

        return self._create_user(phone_number, password, email, **extra_fields)

    # ------------------------------------------------------------------ #
    # Natural key — authenticate by phone (primary) or email (fallback)
    # ------------------------------------------------------------------ #
    def get_by_natural_key(self, username: str) -> "CustomUser":
        return self.get(Q(phone_number=username) | Q(email__iexact=username))
    # phone-first manager (Phase 1 refactor)
