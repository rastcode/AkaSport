"""
API views for the authentication app.

Thin HTTP adapters: they validate input with serializers, delegate business
logic to the service layer, and shape responses. No auth logic lives here.
"""

from __future__ import annotations

from typing import Any

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.authentication.serializers import (
    LoginSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.authentication.services import AuthServiceFactory, OTPAuthService


class RegisterView(generics.CreateAPIView):
    """`POST /api/auth/register/` — customer self-registration."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Registration successful.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    `POST /api/auth/login/` — unified login dispatched by the Factory.

    The factory inspects the payload (`method` key or shape inference) and
    routes to the correct strategy. Returns a JWT access/refresh pair.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Domain exceptions (InvalidCredentials, etc.) are APIExceptions and
        # are rendered automatically by DRF's exception handler.
        service = AuthServiceFactory.create(serializer.validated_data)
        token_pair = service.authenticate()
        return Response(token_pair.as_dict(), status=status.HTTP_200_OK)


class OTPRequestView(APIView):
    """`POST /api/auth/otp/request/` — issue and 'send' a new OTP."""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = OTPAuthService(serializer.validated_data)
        result = service.request_otp()
        return Response(result, status=status.HTTP_200_OK)


class OTPVerifyView(APIView):
    """`POST /api/auth/otp/verify/` — verify an OTP and return JWT tokens."""

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = OTPAuthService(serializer.validated_data)
        token_pair = service.authenticate()
        return Response(token_pair.as_dict(), status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    """
    `GET/PATCH /api/auth/me/` — current user's profile.

    GET returns the profile; PATCH allows updating non-privileged fields
    (first/last name). Role and identity fields remain read-only.
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self) -> Any:
        return self.request.user


class DecoratedTokenRefreshView(TokenRefreshView):
    """`POST /api/auth/token/refresh/` — exchange a refresh token."""

    permission_classes = [AllowAny]
