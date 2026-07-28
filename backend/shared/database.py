from __future__ import annotations

import asyncio
import selectors
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine

POOLER_PORT = "6543"


def selector_loop_factory() -> asyncio.AbstractEventLoop:
    """Builds an event loop psycopg can use for async I/O.

    On Windows the default ProactorEventLoop is incompatible with psycopg's
    async mode, so the process must run on a selector-based loop instead.
    """
    return asyncio.SelectorEventLoop(selectors.SelectSelector())


def install_selector_loop_policy() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(
            type(
                "SelectorPolicy",
                (asyncio.DefaultEventLoopPolicy,),
                {"_loop_factory": staticmethod(selector_loop_factory)},
            )()
        )


def is_transaction_pooler(url: str) -> bool:
    return f":{POOLER_PORT}/" in url


def build_engine(url: str, *, echo: bool = False) -> AsyncEngine:
    """Creates an engine tuned for the target connection.

    Supabase's transaction-mode pooler multiplexes server connections, so
    server-side prepared statements must be disabled; reusing a statement name
    across a recycled backend fails. SQLAlchemy's own pooling is also switched
    off there, since pgbouncer already pools.
    """
    connect_args: dict[str, object] = {}
    kwargs: dict[str, object] = {"echo": echo, "future": True}

    if url.startswith("postgresql"):
        connect_args["prepare_threshold"] = None
        if is_transaction_pooler(url):
            from sqlalchemy.pool import NullPool

            kwargs["poolclass"] = NullPool
        else:
            kwargs["pool_pre_ping"] = True

    return create_async_engine(url, connect_args=connect_args, **kwargs)


@asynccontextmanager
async def engine_scope(url: str) -> AsyncIterator[AsyncEngine]:
    engine = build_engine(url)
    try:
        yield engine
    finally:
        await engine.dispose()


@asynccontextmanager
async def connection_scope(engine: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    async with engine.begin() as connection:
        yield connection
