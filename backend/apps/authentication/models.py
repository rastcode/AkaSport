"""
Domain models for the authentication app (phone-first, Persian e-commerce).

    * `CustomUser`      - identity keyed on `phone_number` (USERNAME_FIELD);
                          email is optional but unique when provided. RBAC role.
    * `OTPVerification` - hashed, single-use, expirable, attempt-limited OTP.

OTP codes are NEVER stored in plaintext: only an HMAC-SHA256 hash is persisted.
The plaintext is returned transiently from `issue()` so the SMS layer can send
it, then discarded.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import timedelta
from typing import Optional

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.authentication.managers import CustomUserManager

# E.164-ish phone validator: optional leading +, 9-15 digits.
phone_validator = RegexValidator(
    regex=r"^\+?\d{9,15}$",
    message=_(
        "شماره تماس معتبر وارد کنید (۹ تا ۱۵ رقم، با + اختیاری). "
        "مثال: +989121234567"
    ),
)


def hash_otp_code(code: str) -> str:
    """Return a deterministic HMAC-SHA256 hash of an OTP code."""
    key = settings.SECRET_KEY.encode("utf-8")
    return hmac.new(key, code.encode("utf-8"), hashlib.sha256).hexdigest()


class CustomUser(AbstractUser):
    """
    Custom user model.

    Authentication identity is the **phone number**. The default `username`
    field is removed. A strict three-tier `role` drives RBAC.
    """

    class Role(models.TextChoices):
        OWNER = "OWNER", _("مالک")          # Superuser / full access
        ADMIN = "ADMIN", _("مدیر")          # Staff / product & content mgmt
        CUSTOMER = "CUSTOMER", _("مشتری")    # Regular buyer / default

    # Remove username entirely — identity is the phone number.
    username = None  # type: ignore[assignment]

    phone_number = models.CharField(
        _("شماره تماس"),
        max_length=16,
        unique=True,
        validators=[phone_validator],
        help_text=_("شناسه‌ی اصلی ورود و احراز هویت."),
    )
    email = models.EmailField(
        _("ایمیل"),
        unique=True,
        null=True,
        blank=True,
        help_text=_("اختیاری؛ در صورت ورود باید یکتا باشد."),
    )
    role = models.CharField(
        _("نقش"),
        max_length=10,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True,
    )
    is_phone_verified = models.BooleanField(_("شماره تأییدشده"), default=False)
    created_at = models.DateTimeField(_("تاریخ ایجاد"), auto_now_add=True)
    updated_at = models.DateTimeField(_("تاریخ به‌روزرسانی"), auto_now=True)

    # Phone is the login identity; email is optional and not required by
    # `createsuperuser` (it prompts for phone_number + password).
    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS: list[str] = []

    objects = CustomUserManager()

    class Meta:
        verbose_name = _("کاربر")
        verbose_name_plural = _("کاربران")
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.phone_number or self.email or f"user#{self.pk}"

    # ------------------------------------------------------------------ #
    # Role convenience properties
    # ------------------------------------------------------------------ #
    @property
    def is_owner(self) -> bool:
        return self.role == self.Role.OWNER

    @property
    def is_admin(self) -> bool:
        """True for ADMIN *or* OWNER (owner is a superset of admin)."""
        return self.role in {self.Role.ADMIN, self.Role.OWNER}

    @property
    def is_customer(self) -> bool:
        return self.role == self.Role.CUSTOMER

    def save(self, *args, **kwargs) -> None:
        """Keep Django's staff/superuser flags consistent with `role`."""
        if self.role == self.Role.OWNER:
            self.is_staff = True
            self.is_superuser = True
        elif self.role == self.Role.ADMIN:
            self.is_staff = True
            self.is_superuser = False
        else:  # CUSTOMER
            self.is_staff = False
            self.is_superuser = False

        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {
                "is_staff",
                "is_superuser",
            }
        super().save(*args, **kwargs)


class OTPVerification(models.Model):
    """
    A hashed, single-use, time-boxed OTP challenge tied to a user.

    Security properties:
        * the plaintext code is never stored — only `code_hash`;
        * `expires_at` enforces a short lifetime;
        * `is_used` enforces single use;
        * `attempts` / `max_attempts` cap brute-force guessing.
    """

    class Purpose(models.TextChoices):
        LOGIN = "LOGIN", _("ورود")
        REGISTER = "REGISTER", _("ثبت‌نام")
        RESET = "RESET", _("بازیابی")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="otp_codes",
        verbose_name=_("کاربر"),
    )
    code_hash = models.CharField(_("هش کد"), max_length=64)
    purpose = models.CharField(
        _("هدف"),
        max_length=10,
        choices=Purpose.choices,
        default=Purpose.LOGIN,
    )
    is_used = models.BooleanField(_("استفاده‌شده"), default=False)
    attempts = models.PositiveSmallIntegerField(_("تعداد تلاش"), default=0)
    max_attempts = models.PositiveSmallIntegerField(_("حداکثر تلاش"), default=5)
    created_at = models.DateTimeField(_("تاریخ ایجاد"), auto_now_add=True)
    expires_at = models.DateTimeField(_("تاریخ انقضا"))

    class Meta:
        verbose_name = _("کد یک‌بارمصرف")
        verbose_name_plural = _("کدهای یک‌بارمصرف")
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["user", "purpose", "is_used"])]

    def __str__(self) -> str:
        return f"OTP({self.user_id}, {self.purpose}, used={self.is_used})"

    # ------------------------------------------------------------------ #
    # Factory & lifecycle
    # ------------------------------------------------------------------ #
    @staticmethod
    def generate_code(length: int = 6) -> str:
        """Cryptographically-random numeric OTP, zero-padded."""
        return str(secrets.randbelow(10 ** length)).zfill(length)

    @classmethod
    def issue(
        cls,
        user: "CustomUser",
        purpose: str = Purpose.LOGIN,
        ttl_minutes: Optional[int] = None,
    ) -> "OTPVerification":
        """
        Create a fresh hashed OTP, invalidating prior unused ones.

        The returned instance carries the plaintext on a transient
        `plain_code` attribute (never persisted) for the SMS layer.
        """
        ttl = ttl_minutes if ttl_minutes is not None else settings.OTP_EXPIRY_MINUTES
        max_attempts = getattr(settings, "OTP_MAX_ATTEMPTS", 5)

        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(
            is_used=True
        )

        plain = cls.generate_code(getattr(settings, "OTP_LENGTH", 6))
        otp = cls.objects.create(
            user=user,
            code_hash=hash_otp_code(plain),
            purpose=purpose,
            max_attempts=max_attempts,
            expires_at=timezone.now() + timedelta(minutes=ttl),
        )
        # Transient — available only on this in-memory instance.
        otp.plain_code = plain  # type: ignore[attr-defined]
        return otp

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self) -> bool:
        return (
            not self.is_used
            and not self.is_expired
            and self.attempts < self.max_attempts
        )

    def check_code(self, code: str) -> bool:
        """Constant-time comparison of a submitted code against the hash."""
        return hmac.compare_digest(self.code_hash, hash_otp_code(str(code)))

    def mark_used(self) -> None:
        self.is_used = True
        self.save(update_fields=["is_used"])

    def register_failed_attempt(self) -> None:
        self.attempts = models.F("attempts") + 1
        self.save(update_fields=["attempts"])
        self.refresh_from_db(fields=["attempts"])
