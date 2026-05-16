from __future__ import annotations

from dataclasses import dataclass

from robot.pipeline.session_runtime import SessionRuntime
from robot.providers.geonode import GeoNodeConfig


@dataclass
class Slot:
    index: int
    runtime: SessionRuntime


class SessionPool:
    def __init__(
        self,
        size: int,
        *,
        geonode: GeoNodeConfig,
        chrome_binary: str,
        **runtime_kwargs: object,
    ) -> None:
        self._slots = [
            Slot(
                index=i,
                runtime=SessionRuntime(
                    run_id=f"pool-slot-{i + 1}",
                    worker_id=1,
                    slot_id=i + 1,
                    geonode=geonode,
                    chrome_binary=chrome_binary,
                    **runtime_kwargs,  # type: ignore[arg-type]
                ),
            )
            for i in range(size)
        ]

    def slot(self, index: int) -> Slot:
        return self._slots[index]

    def close_all(self) -> None:
        for slot in self._slots:
            slot.runtime.close_active(cooldown_s=0.0)
