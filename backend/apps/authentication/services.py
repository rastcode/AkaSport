"""
Authentication service layer (Clean Architecture — use cases).

This module decouples *authentication strategy* from the HTTP layer. Views
hand a raw payload to `AuthServiceFactory`, which selects the appropriate
concrete `BaseAuthService` and returns a JWT token pair. Adding a new login
method (e.g. real OAuth2) is a matter of writing one class and registering it
with the factory — no view changes required (Open/Closed Principle).

Strategies implemented:
    * EmailAuthService  - email/phone + password.
    * OTPAuthService    - phone + one-time password (mock SMS).
    * OAuth2AuthService - extensible placeholder.
"""

from __future__ import annotations

import abc
import logging
from dataclasses import dataclass
from typing import Any, ClassVar, Optional, Type

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.exceptions import (
    InactiveAccount,
    InvalidCredentials,
    OTPExpiredOrInvalid,
    OTPTooManyAttempts,
    UnsupportedAuthMethod,
    UserNotFound,
)
from apps.authentication.models import OTPVerification

User = get_user_model()


# --------------------------------------------------------------------------- #
# Token issuance helper
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class TokenPair:
    """Immutable value object holding an issued JWT pair + user snapshot."""

    access: str
    refresh: str
    user: Any

    def as_dict(self) -> dict[str, Any]:
        return {
            "access": self.access,
            "refresh": self.refresh,
            "user": {
                "id": self.user.id,
                "email": self.user.email,
                "phone_number": self.user.phone_number,
                "role": self.user.role,
            },
        }


def issue_tokens(user: Any) -> TokenPair:
    """
    Build a SimpleJWT refresh/access pair for `user`, embedding custom claims.

    Custom claims are attached centrally here (and in the token serializer) so
    every code path that mints tokens produces consistent payloads.
    """
    refresh = RefreshToken.for_user(user)
    # Embed RBAC-relevant claims directly in the token payload.
    refresh["role"] = user.role
    refresh["email"] = user.email
    refresh["phone_number"] = user.phone_number
    access = refresh.access_token
    return TokenPair(access=str(access), refresh=str(refresh), user=user)


# --------------------------------------------------------------------------- #
# Strategy base class
# --------------------------------------------------------------------------- #
class BaseAuthService(abc.ABC):
    """
    Abstract base for all authentication strategies.

    Subclasses receive the validated request payload and implement
    `authenticate()` to return a `TokenPair` or raise an API exception.
    """

    #: Identifier used by the factory to select this strategy.
    method: ClassVar[str]

    def __init__(self, payload: dict[str, Any]) -> None:
        self.payload = payload

    @abc.abstractmethod
    def authenticate(self) -> TokenPair:
        """Authenticate the request and return a JWT token pair."""
        raise NotImplementedError

    # Shared guard reused by concrete strategies.
    @staticmethod
    def _ensure_active(user: Any) -> None:
        if not user.is_active:
            raise InactiveAccount()


# --------------------------------------------------------------------------- #
# Concrete strategy: Email / Phone + Password
# --------------------------------------------------------------------------- #
class EmailAuthService(BaseAuthService):
    """Authenticate with an identifier (email or phone) and a password."""

    method = "password"

    def authenticate(self) -> TokenPair:
        identifier = (
            self.payload.get("identifier")
            or self.payload.get("email")
            or self.payload.get("phone_number")
        )
        password = self.payload.get("password")

        if not identifier or not password:
            raise InvalidCredentials(
                "Both an identifier (email/phone) and password are required."
            )

        # Delegates to MultiFieldModelBackend (configured in settings).
        user = authenticate(username=identifier, password=password)
        if user is None:
            raise InvalidCredentials()

        self._ensure_active(user)
        return issue_tokens(user)


# --------------------------------------------------------------------------- #
# Concrete strategy: Phone + OTP
# --------------------------------------------------------------------------- #
class OTPAuthService(BaseAuthService):
    """
    Phone-number OTP authentication.

    Two responsibilities:
        * `request_otp()`  - generate + "send" (mock) a one-time code.
        * `authenticate()` - verify a submitted code and mint tokens.
    """

    method = "otp"

    # ----------------------------- helpers ----------------------------- #
    @staticmethod
    def _get_user_by_phone(phone_number: str) -> Any:
        try:
            return User.objects.get(phone_number=phone_number)
        except User.DoesNotExist as exc:
            raise UserNotFound(
                "No account is registered with this phone number."
            ) from exc

    @staticmethod
    def _send_sms(phone_number: str, code: str) -> None:
        """
        Mock SMS gateway.

        A real deployment should replace this with an SMS provider. The code
        is logged only in DEBUG so it is never exposed in production output.
        """
        if settings.DEBUG:
            logging.getLogger("apps.authentication.otp").debug(
                "[MOCK SMS] -> %s code=%s", phone_number, code
            )

    # ----------------------------- use cases --------------------------- #
    def request_otp(self) -> dict[str, Any]:
        """
        Issue a fresh OTP for the supplied phone number and 'send' it.

        Returns metadata about the issued code (never the code itself in a
        real system; included here only to ease local testing).
        """
        phone_number = self.payload.get("phone_number")
        if not phone_number:
            raise InvalidCredentials("A phone number is required.")

        user = self._get_user_by_phone(phone_number)
        self._ensure_active(user)

        with transaction.atomic():
            otp = OTPVerification.issue(
                user=user, purpose=OTPVerification.Purpose.LOGIN
            )
        self._send_sms(phone_number, otp.plain_code)

        result: dict[str, Any] = {
            "detail": "کد تأیید ارسال شد.",
            "phone_number": phone_number,
            "expires_at": otp.expires_at,
        }
        # Local convenience only; production responses never expose the OTP.
        if settings.DEBUG:
            result["debug_code"] = otp.plain_code
        return result

    def authenticate(self) -> TokenPair:
        """Verify a submitted OTP code and return tokens on success."""
        phone_number = self.payload.get("phone_number")
        code = self.payload.get("code") or self.payload.get("otp")

        if not phone_number or not code:
            raise InvalidCredentials("Phone number and OTP code are required.")

        user = self._get_user_by_phone(phone_number)
        self._ensure_active(user)

        # Fetch the most recent unused login OTP.
        otp: Optional[OTPVerification] = (
            OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.Purpose.LOGIN,
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )
        if otp is None:
            raise OTPExpiredOrInvalid("No active OTP found. Request a new code.")

        if otp.attempts >= self._max_attempts():
            otp.mark_used()
            raise OTPTooManyAttempts()

        if otp.is_expired:
            otp.mark_used()
            raise OTPExpiredOrInvalid("This OTP has expired. Request a new code.")

        # Constant-time comparison of the submitted code against the hash.
        if not otp.check_code(str(code)):
            otp.register_failed_attempt()
            if otp.attempts >= self._max_attempts():
                otp.mark_used()
                raise OTPTooManyAttempts()
            raise OTPExpiredOrInvalid("Incorrect OTP code.")

        # Success — consume the code and mark the phone verified.
        with transaction.atomic():
            otp.mark_used()
            if not user.is_phone_verified:
                user.is_phone_verified = True
                user.save(update_fields=["is_phone_verified"])

        return issue_tokens(user)

    @staticmethod
    def _max_attempts() -> int:
        from django.conf import settings

        return settings.OTP_MAX_ATTEMPTS


# --------------------------------------------------------------------------- #
# Concrete strategy: OAuth2 (placeholder / extension point)
# --------------------------------------------------------------------------- #
class OAuth2AuthService(BaseAuthService):
    """
    Placeholder for social / OAuth2 login (Google, Apple, ...).

    The skeleton documents the intended flow so a future implementation can
    drop in without touching the factory or views.
    """

    method = "oauth2"

    def authenticate(self) -> TokenPair:
        # Intended future flow:
        #   1. Read `provider` + `access_token` (or `code`) from payload.
        #   2. Exchange/validate the token with the provider.
        #   3. get_or_create a CustomUser from the verified profile.
        #   4. return issue_tokens(user)
        raise UnsupportedAuthMethod(
            "OAuth2 login is not yet implemented. This is an extension point."
        )


# --------------------------------------------------------------------------- #
# Factory
# --------------------------------------------------------------------------- #
class AuthServiceFactory:
    """
    Select the correct authentication strategy for an incoming payload.

    Resolution order:
        1. An explicit `method` key in the payload, if present.
        2. Inference from the payload shape (OTP code -> OTP, password ->
           password).
    """

    _registry: ClassVar[dict[str, Type[BaseAuthService]]] = {
        EmailAuthService.method: EmailAuthService,
        OTPAuthService.method: OTPAuthService,
        OAuth2AuthService.method: OAuth2AuthService,
    }

    @classmethod
    def register(cls, service_cls: Type[BaseAuthService]) -> Type[BaseAuthService]:
        """Register a new strategy. Usable as a class decorator."""
        cls._registry[service_cls.method] = service_cls
        return service_cls

    @classmethod
    def _infer_method(cls, payload: dict[str, Any]) -> str:
        if payload.get("provider") or payload.get("access_token"):
            return OAuth2AuthService.method
        if payload.get("code") or payload.get("otp"):
            return OTPAuthService.method
        if payload.get("password"):
            return EmailAuthService.method
        raise UnsupportedAuthMethod(
            "Could not determine an authentication method from the payload."
        )

    @classmethod
    def create(cls, payload: dict[str, Any]) -> BaseAuthService:
        """Instantiate the appropriate `BaseAuthService` for `payload`."""
        method = payload.get("method") or cls._infer_method(payload)
        method = str(method).lower()

        service_cls = cls._registry.get(method)
        if service_cls is None:
            raise UnsupportedAuthMethod(
                f"Unsupported authentication method: '{method}'."
            )
        return service_cls(payload)


# --------------------------------------------------------------------------- #
# Small utilities
# --------------------------------------------------------------------------- #
def _constant_time_eq(a: str, b: str) -> bool:
    """Constant-time string comparison (wraps `secrets.compare_digest`)."""
    import secrets

    return secrets.compare_digest(a, b)
