"""URL routing for the authentication app (mounted under `/api/auth/`)."""

from django.urls import path

from apps.authentication.views import (
    DecoratedTokenRefreshView,
    LoginView,
    LogoutView,
    MeView,
    OTPRequestView,
    OTPVerifyView,
    RegisterView,
)

app_name = "authentication"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("otp/request/", OTPRequestView.as_view(), name="otp-request"),
    path("otp/verify/", OTPVerifyView.as_view(), name="otp-verify"),
    path("me/", MeView.as_view(), name="me"),
    path("token/refresh/", DecoratedTokenRefreshView.as_view(), name="token-refresh"),
]
