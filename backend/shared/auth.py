from __future__ import annotations

import hashlib
import hmac
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import APIKeyHeader

from shared.errors import AuthenticationError
from shared.settings import Settings, get_settings

API_KEY_HEADER = "X-API-Key"

_api_key_scheme = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode("utf-8")).digest()


def _matches_any(candidate: str, known_keys: frozenset[str]) -> bool:
    """Constant-time membership test.

    Comparing digests with `compare_digest` keeps the work independent of how
    many leading characters match, so a caller cannot brute-force a key one
    byte at a time by measuring response latency.
    """
    candidate_digest = _digest(candidate)
    matched = False
    for known in known_keys:
        matched |= hmac.compare_digest(candidate_digest, _digest(known))
    return matched


class Principal:
    """The authenticated caller. Identified by key fingerprint, never by key."""

    __slots__ = ("key_id", "is_anonymous")

    def __init__(self, key_id: str, is_anonymous: bool = False) -> None:
        self.key_id = key_id
        self.is_anonymous = is_anonymous

    @classmethod
    def from_api_key(cls, api_key: str) -> Principal:
        fingerprint = hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:12]
        return cls(key_id=f"key_{fingerprint}")

    @classmethod
    def anonymous(cls, client_id: str) -> Principal:
        return cls(key_id=f"anon_{client_id}", is_anonymous=True)


def client_fingerprint(request: Request) -> str:
    host = request.client.host if request.client is not None else "unknown"
    return hashlib.sha256(host.encode("utf-8")).hexdigest()[:12]


async def authenticate(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    api_key: Annotated[str | None, Depends(_api_key_scheme)] = None,
) -> Principal:
    """Resolves the caller.

    Development runs without configured keys stay open so the local workflow
    needs no setup; every other environment rejects unauthenticated calls, and
    `require_valid_configuration` guarantees keys exist there.
    """
    known_keys = settings.parsed_api_keys

    if not known_keys and settings.is_development:
        return Principal.anonymous(client_fingerprint(request))

    if api_key is None or not api_key.strip():
        raise AuthenticationError("Missing API key. Supply it in the X-API-Key header.")

    if not _matches_any(api_key.strip(), known_keys):
        raise AuthenticationError("The supplied API key is not valid.")

    return Principal.from_api_key(api_key.strip())


AuthenticatedPrincipal = Annotated[Principal, Depends(authenticate)]
