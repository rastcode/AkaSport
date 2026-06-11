"""
Domain-specific API exceptions for the authentication app.

These subclass DRF's `APIException` so they are rendered as clean JSON error
responses with appropriate HTTP status codes by the default exception handler.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import APIException, Throttled


class InvalidCredentials(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "The provided credentials are invalid."
    default_code = "invalid_credentials"


class InactiveAccount(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "This account is inactive."
    default_code = "inactive_account"


class UnsupportedAuthMethod(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Unsupported authentication method."
    default_code = "unsupported_auth_method"


class OTPExpiredOrInvalid(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The OTP code is invalid, expired, or already used."
    default_code = "otp_invalid"


class OTPTooManyAttempts(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "Too many incorrect OTP attempts. Request a new code."
    default_code = "otp_too_many_attempts"


class PersianThrottled(Throttled):
    default_detail = "درخواست‌های زیادی ارسال شده است. لطفاً کمی بعد دوباره تلاش کنید."
    extra_detail_singular = "امکان تلاش مجدد در {wait} ثانیه."
    extra_detail_plural = "امکان تلاش مجدد در {wait} ثانیه."


class UserNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "No account matches the supplied identifier."
    default_code = "user_not_found"
