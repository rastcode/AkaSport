"""
Dynamic-attribute schema validation.

A `Category` carries a `dynamic_attributes_schema` (JSONB) that acts as a
blueprint for the `specifications` JSON of every `Product` in that category.
This module centralises the validation logic so it can be reused from model
`clean()` methods and from DRF serializers.

Schema format (per attribute key):

    {
        "weight":    {"type": "string",  "label": "Weight",   "required": true},
        "material":  {"type": "string",  "label": "Material", "required": false},
        "waterproof":{"type": "boolean", "label": "Waterproof"},
        "rating":    {"type": "number",  "label": "Rating",   "choices": [1,2,3,4,5]}
    }

Supported `type` values map to Python types as defined in `_TYPE_MAP`.
"""

from __future__ import annotations

from numbers import Number
from typing import Any, Mapping

from django.core.exceptions import ValidationError

# JSON schema "type" string -> acceptable Python type(s).
_TYPE_MAP: dict[str, tuple[type, ...]] = {
    "string": (str,),
    "number": (int, float),
    "integer": (int,),
    "boolean": (bool,),
    "array": (list,),
    "object": (dict,),
}


def validate_schema_definition(schema: Any) -> None:
    """
    Validate the *shape of the schema itself* (used on `Category.clean`).

    Ensures the blueprint is a well-formed mapping of attribute definitions.
    """
    if schema in (None, {}):
        return
    if not isinstance(schema, Mapping):
        raise ValidationError(
            {"dynamic_attributes_schema": "Schema must be a JSON object."}
        )

    for key, definition in schema.items():
        if not isinstance(definition, Mapping):
            raise ValidationError(
                {
                    "dynamic_attributes_schema": (
                        f"Definition for '{key}' must be an object, "
                        f"e.g. {{'type': 'string', 'label': '...'}}."
                    )
                }
            )
        declared_type = definition.get("type")
        if declared_type is None:
            raise ValidationError(
                {
                    "dynamic_attributes_schema": (
                        f"Attribute '{key}' is missing a 'type'."
                    )
                }
            )
        if declared_type not in _TYPE_MAP:
            raise ValidationError(
                {
                    "dynamic_attributes_schema": (
                        f"Attribute '{key}' has unsupported type "
                        f"'{declared_type}'. Allowed: {sorted(_TYPE_MAP)}."
                    )
                }
            )
        choices = definition.get("choices")
        if choices is not None and not isinstance(choices, list):
            raise ValidationError(
                {
                    "dynamic_attributes_schema": (
                        f"'choices' for attribute '{key}' must be a list."
                    )
                }
            )


def validate_specifications(
    schema: Any,
    specifications: Any,
    *,
    field_name: str = "specifications",
) -> None:
    """
    Validate a product's `specifications` against a category `schema`.

    Rules enforced:
        * `specifications` must be a JSON object.
        * Every key present must be declared in the schema (no stray keys).
        * Every value's type must match the declared type.
        * `required` attributes must be present and non-empty.
        * If `choices` is declared, the value must be one of them.

    Raises `django.core.exceptions.ValidationError` with a clear message.
    """
    schema = schema or {}
    specifications = specifications or {}

    if not isinstance(specifications, Mapping):
        raise ValidationError({field_name: "Specifications must be a JSON object."})

    # If no schema is defined, accept any object (category imposes no blueprint).
    if not schema:
        return

    errors: list[str] = []

    # 1) Unknown keys.
    allowed_keys = set(schema.keys())
    for key in specifications:
        if key not in allowed_keys:
            errors.append(
                f"'{key}' is not a valid specification for this category. "
                f"Allowed keys: {sorted(allowed_keys)}."
            )

    # 2) Per-attribute checks.
    for key, definition in schema.items():
        declared_type = definition.get("type", "string")
        expected_types = _TYPE_MAP.get(declared_type, (str,))
        required = bool(definition.get("required", False))
        choices = definition.get("choices")

        present = key in specifications
        value = specifications.get(key)

        if not present:
            if required:
                errors.append(f"'{key}' is required for this category.")
            continue

        if required and value in (None, "", [], {}):
            errors.append(f"'{key}' is required and cannot be empty.")
            continue

        if value is not None and not _matches_type(value, expected_types):
            errors.append(
                f"'{key}' must be of type '{declared_type}', "
                f"got '{type(value).__name__}'."
            )
            continue

        if choices is not None and value not in choices:
            errors.append(f"'{key}' must be one of {choices}, got {value!r}.")

    if errors:
        raise ValidationError({field_name: errors})


def _matches_type(value: Any, expected_types: tuple[type, ...]) -> bool:
    """
    Type check that treats booleans distinctly from numbers.

    In Python `bool` is a subclass of `int`, so a naive `isinstance(True, int)`
    would wrongly accept booleans for numeric fields and vice-versa.
    """
    if bool in expected_types:
        return isinstance(value, bool)
    if isinstance(value, bool):
        # Only valid if the schema explicitly expects a boolean (handled above).
        return False
    if expected_types == (int,):
        return isinstance(value, int)
    if expected_types == (int, float):
        return isinstance(value, Number)
    return isinstance(value, expected_types)
