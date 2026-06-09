"""
Idempotently create the default OWNER (superuser) account.

Reads credentials from environment variables (with safe dev defaults) so the
setup script can run it non-interactively:

    DJANGO_OWNER_EMAIL     (default: owner@akasport.local)
    DJANGO_OWNER_PHONE     (default: +989120000000)
    DJANGO_OWNER_PASSWORD  (default: Owner@12345)

Usage:
    python manage.py seed_owner
"""

from __future__ import annotations

import os
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create the default OWNER account if it does not already exist."

    def handle(self, *args: Any, **options: Any) -> None:
        email = os.environ.get("DJANGO_OWNER_EMAIL", "owner@akasport.local")
        phone = os.environ.get("DJANGO_OWNER_PHONE", "+989120000000")
        password = os.environ.get("DJANGO_OWNER_PASSWORD", "Owner@12345")

        # Phone is the primary identity — check idempotency by phone.
        existing = User.objects.filter(phone_number=phone).first()
        if existing is not None:
            self.stdout.write(
                self.style.WARNING(
                    f"OWNER already exists: {phone} (skipping creation)."
                )
            )
            return

        User.objects.create_superuser(
            phone_number=phone,
            password=password,
            email=email,
        )
        self.stdout.write(self.style.SUCCESS("OWNER account created."))
        self.stdout.write(f"  email    : {email}")
        self.stdout.write(f"  phone    : {phone}")
        self.stdout.write(f"  password : {password}")
        self.stdout.write(
            self.style.WARNING("  -> Change this password before any real use.")
        )
        # phone-first owner seeding (Phase 1 refactor)
