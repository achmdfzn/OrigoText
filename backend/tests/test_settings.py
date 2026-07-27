from __future__ import annotations

import pytest

from shared.settings import Settings


def test_production_without_keys_fails_startup() -> None:
    settings = Settings(environment="production", api_keys="")

    with pytest.raises(RuntimeError, match="ORIGOTEXT_API_KEYS"):
        settings.require_valid_configuration()


def test_staging_rejects_short_keys() -> None:
    settings = Settings(environment="staging", api_keys="too-short")

    with pytest.raises(RuntimeError, match="at least 32 characters"):
        settings.require_valid_configuration()


def test_production_with_strong_keys_starts() -> None:
    settings = Settings(environment="production", api_keys="k" * 32)
    settings.require_valid_configuration()

    assert settings.parsed_api_keys == frozenset({"k" * 32})


def test_development_without_keys_is_permitted() -> None:
    settings = Settings(environment="development", api_keys="")
    settings.require_valid_configuration()

    assert settings.is_development is True


def test_unknown_environment_is_rejected() -> None:
    with pytest.raises(ValueError, match="environment must be one of"):
        Settings(environment="prod")


def test_keys_and_origins_are_parsed_from_csv() -> None:
    settings = Settings(
        api_keys=f" {'a' * 40} , {'b' * 40} ",
        allowed_origins="http://localhost:3000, https://app.origotext.dev",
    )

    assert settings.parsed_api_keys == frozenset({"a" * 40, "b" * 40})
    assert settings.parsed_allowed_origins == [
        "http://localhost:3000",
        "https://app.origotext.dev",
    ]


def test_rate_limits_must_be_positive() -> None:
    with pytest.raises(ValueError):
        Settings(rate_limit_per_minute=0)
