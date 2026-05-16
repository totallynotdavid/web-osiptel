from __future__ import annotations

import json
import uuid

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal


if TYPE_CHECKING:
    from robot.api import ServiceConfig


ProxyType = Literal["residential", "datacenter", "mix"]

_GATEWAY_HOST_BY_NAME: dict[str, str] = {
    "fr": "proxy.geonode.io",
    "fr_whitelist": "prod-proxy.geonode.io",
    "us": "us.proxy.geonode.io",
    "sg": "sg.proxy.geonode.io",
}
_HTTP_STICKY_PORT_MIN = 10000
_HTTP_STICKY_PORT_MAX = 10900
_RELEASE_URL = "https://monitor.geonode.com/sessions/release/proxies"


@dataclass(frozen=True)
class GeoNodeConfig:
    user: str
    password: str
    host: str
    proxy_type: ProxyType
    country: str
    state: str
    city: str
    asn: str
    strict_off: bool
    lifetime: int


@dataclass(frozen=True)
class ProxySessionConfig:
    proxy_id: str
    host: str
    port: str
    password: str
    username: str
    session_id: str

    def as_selenium_proxy(self) -> str:
        return f"{self.username}:{self.password}@{self.host}:{self.port}"

    def as_http_proxy_url(self) -> str:
        return f"http://{self.username}:{self.password}@{self.host}:{self.port}"


def make_geonode_config(
    *, config: ServiceConfig, user: str, password: str
) -> GeoNodeConfig:
    if not user or not password:
        msg = "proxy_user and proxy_pass are required"
        raise ValueError(msg)
    if config.geonode_gateway not in _GATEWAY_HOST_BY_NAME:
        msg = "GEONODE_GATEWAY must be one of " + "|".join(
            sorted(_GATEWAY_HOST_BY_NAME)
        )
        raise RuntimeError(msg)
    if config.geonode_lifetime < 3 or config.geonode_lifetime > 1440:
        msg = "GEONODE_LIFETIME must be between 3 and 1440 minutes"
        raise RuntimeError(msg)
    return GeoNodeConfig(
        user=user,
        password=password,
        host=_GATEWAY_HOST_BY_NAME[config.geonode_gateway],
        proxy_type=config.geonode_type,
        country=config.geonode_country,
        state=config.geonode_state,
        city=config.geonode_city,
        asn=config.geonode_asn,
        strict_off=config.geonode_strict_off,
        lifetime=config.geonode_lifetime,
    )


def build_username(config: GeoNodeConfig, *, session_id: str) -> str:
    chunks: list[str] = [config.user, "session", session_id]

    if config.proxy_type:
        chunks.extend(["type", config.proxy_type])
    if config.country:
        chunks.extend(["country", config.country])
    if config.state:
        chunks.extend(["state", config.state])
    if config.city:
        chunks.extend(["city", config.city])
    if config.asn:
        chunks.extend(["asn", config.asn])
    if config.strict_off:
        chunks.extend(["strict", "off"])
    if config.lifetime:
        chunks.extend(["lifetime", str(config.lifetime)])

    return "-".join(chunks)


def slot_port(*, slot_id: int) -> int:
    if slot_id < 1:
        msg = "slot_id must be >= 1"
        raise ValueError(msg)
    return _HTTP_STICKY_PORT_MIN + slot_id - 1


def new_proxy_session(config: GeoNodeConfig, *, slot_id: int) -> ProxySessionConfig:
    port = slot_port(slot_id=slot_id)
    if port > _HTTP_STICKY_PORT_MAX:
        max_slots = _HTTP_STICKY_PORT_MAX - _HTTP_STICKY_PORT_MIN + 1
        msg = f"slot_id must be <= {max_slots}"
        raise ValueError(msg)
    session_id = _new_session_id(slot_id)
    proxy_id = f"proxy-1-port-{port}"
    username = build_username(config, session_id=session_id)
    return ProxySessionConfig(
        proxy_id=proxy_id,
        host=config.host,
        port=str(port),
        password=config.password,
        username=username,
        session_id=session_id,
    )


def release_proxy_session(
    *, config: GeoNodeConfig, session_id: str, port: int, timeout_s: float = 10.0
) -> tuple[bool, int, str]:
    return _release_sticky_session(
        user=config.user,
        password=config.password,
        session_id=session_id,
        port=port,
        timeout_s=timeout_s,
    )


def _new_session_id(slot_id: int) -> str:
    return f"s{slot_id}_{uuid.uuid4().hex[:8]}"


def _release_sticky_session(
    *, user: str, password: str, session_id: str, port: int, timeout_s: float
) -> tuple[bool, int, str]:
    import httpx

    try:
        with httpx.Client(timeout=timeout_s, auth=(user, password)) as client:
            response = client.put(
                _RELEASE_URL,
                json={"data": [{"sessionId": session_id, "port": port}]},
            )
        if response.status_code != 200:
            return False, response.status_code, response.text[:300]
        payload = response.json()
        if not isinstance(payload, dict) or not bool(payload.get("success")):
            return False, response.status_code, json.dumps(payload)[:300]
        return True, response.status_code, ""
    except (httpx.HTTPError, ValueError) as exc:
        return False, 0, f"{type(exc).__name__}: {exc}"
