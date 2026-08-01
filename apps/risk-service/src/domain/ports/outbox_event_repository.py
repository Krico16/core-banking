from typing import Protocol

from domain.entities.outbox_event import OutboxEvent


class OutboxEventRepository(Protocol):
    def save(self, event: OutboxEvent) -> None: ...
