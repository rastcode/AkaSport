"""
DRF serializers for the authentication app.

Covers registration, the unified login payload, OTP request/verify, the
user-profile representation, and the customized JWT token claims.
"""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.authentication.models import CustomUser, OTPVerification, phone_validator

User = get_user_model()


# --------------------------------------------------------------------------- #
# User representation
# --------------------------------------------------------------------------- #
class UserSerializer(serializers.ModelSerializer):
    """Read-only-ish profile representation returned by `/me/` and others."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "phone_number",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "is_phone_verified",
            "is_active",
            "date_joined",
            "created_at",
        )
        read_only_fields = (
            "id",
            "role",
            "role_display",
            "is_phone_verified",
            "is_active",
            "date_joined",
            "created_at",
        )


# --------------------------------------------------------------------------- #
# Registration
# --------------------------------------------------------------------------- #
class RegisterSerializer(serializers.ModelSerializer):
    """
    Customer self-registration.

    Requires at least one identifier (email or phone) plus a password. Role is
    forced to CUSTOMER server-side; clients cannot self-assign privileges.
    """

    password = serializers.CharField(
        write_only=True, min_length=8, style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    phone_number = serializers.CharField(validators=[phone_validator], required=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = (
            "id",
            "phone_number",
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
        )

    # --------------------------- validation ---------------------------- #
    def validate_email(self, value: str) -> str:
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate_phone_number(self, value: str) -> str:
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "رمزهای عبور یکسان نیستند."}
            )
        # Run Django's configured password validators.
        validate_password(attrs["password"])
        return attrs

    # ----------------------------- create ------------------------------ #
    def create(self, validated_data: dict[str, Any]) -> CustomUser:
        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        # Normalise an empty-string email to NULL (unique constraint friendly).
        if not validated_data.get("email"):
            validated_data.pop("email", None)
        # Manager enforces CUSTOMER role + phone-first invariants.
        user = User.objects.create_user(password=password, **validated_data)
        return user


# --------------------------------------------------------------------------- #
# Unified login (Factory-driven)
# --------------------------------------------------------------------------- #
class LoginSerializer(serializers.Serializer):
    """
    Loose schema for the unified `/login/` endpoint.

    Field requirements vary per method, so this serializer only does light
    shape validation. The `AuthServiceFactory` performs strategy-specific
    checks. All fields are optional and passed through to the factory.
    """

    method = serializers.ChoiceField(
        choices=("password", "otp", "oauth2"), required=False
    )
    identifier = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    password = serializers.CharField(
        required=False, write_only=True, style={"input_type": "password"}
    )
    code = serializers.CharField(required=False)
    # OAuth2 extension fields (forward-compatible).
    provider = serializers.CharField(required=False)
    access_token = serializers.CharField(required=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if not attrs:
            raise serializers.ValidationError("Empty login payload.")
        return attrs


# --------------------------------------------------------------------------- #
# OTP request / verify
# --------------------------------------------------------------------------- #
class OTPRequestSerializer(serializers.Serializer):
    """Request a new OTP for a registered phone number."""

    phone_number = serializers.CharField(validators=[phone_validator])


class OTPVerifySerializer(serializers.Serializer):
    """Verify an OTP code for a phone number."""

    phone_number = serializers.CharField(validators=[phone_validator])
    code = serializers.CharField(min_length=6, max_length=6)


# --------------------------------------------------------------------------- #
# Custom JWT token claims
# --------------------------------------------------------------------------- #
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Embed `role`, `email`, and `phone_number` into the JWT payload.

    Wired via `SIMPLE_JWT["TOKEN_OBTAIN_SERIALIZER"]` so any standard
    token-obtain flow also carries the custom claims.
    """

    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user: CustomUser):  # type: ignore[override]
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["phone_number"] = user.phone_number
        return token

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        data = super().validate(attrs)
        # Enrich the response body with a user snapshot.
        data["user"] = UserSerializer(self.user).data
        return data
