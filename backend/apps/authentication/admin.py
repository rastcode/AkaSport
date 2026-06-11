"""
Django admin configuration.

Provides the Owner with a visual interface to manage users, their RBAC role,
identity fields, permissions, and to inspect issued OTP codes.
"""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.utils.translation import gettext_lazy as _

from apps.authentication.models import CustomUser, OTPVerification


class CustomUserCreationForm(UserCreationForm):
    """Creation form bound to the custom identity fields (no username)."""

    class Meta(UserCreationForm.Meta):
        model = CustomUser
        fields = ("phone_number", "email", "role")


class CustomUserChangeForm(UserChangeForm):
    """Change form bound to the custom user model."""

    class Meta(UserChangeForm.Meta):
        model = CustomUser
        fields = "__all__"


@admin.register(CustomUser)
class CustomUserAdmin(DjangoUserAdmin):
    """Admin for the custom user model, re-mapped away from `username`."""

    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser

    ordering = ("-created_at",)
    list_display = (
        "id",
        "email",
        "phone_number",
        "role",
        "is_phone_verified",
        "is_active",
        "is_staff",
        "created_at",
    )
    list_display_links = ("id", "email", "phone_number")
    list_filter = ("role", "is_active", "is_staff", "is_superuser", "is_phone_verified")
    search_fields = ("email", "phone_number", "first_name", "last_name")
    readonly_fields = (
        "is_staff",
        "is_superuser",
        "last_login",
        "date_joined",
        "created_at",
        "updated_at",
    )

    # Detail (change) layout.
    fieldsets = (
        (None, {"fields": ("phone_number", "email", "password")}),
        (_("اطلاعات شخصی"), {"fields": ("first_name", "last_name")}),
        (
            _("نقش و دسترسی‌ها"),
            {
                "fields": (
                    "role",
                    "is_phone_verified",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (_("تاریخ‌های مهم"), {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
    )

    # Creation (add) layout.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "phone_number",
                    "email",
                    "role",
                    "password1",
                    "password2",
                    "is_active",
                ),
            },
        ),
    )


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    """Read-mostly view of issued OTP codes for auditing/debugging."""

    list_display = (
        "id",
        "user",
        "purpose",
        "is_used",
        "attempts",
        "created_at",
        "expires_at",
    )
    list_filter = ("purpose", "is_used")
    search_fields = ("user__email", "user__phone_number")
    # `code_hash` is intentionally NOT shown — the plaintext is never stored.
    readonly_fields = (
        "user",
        "purpose",
        "attempts",
        "max_attempts",
        "is_used",
        "created_at",
        "expires_at",
    )
    ordering = ("-created_at",)
