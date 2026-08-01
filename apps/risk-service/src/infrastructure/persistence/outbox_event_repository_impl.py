from sqlalchemy.orm import Session

from domain.entities.outbox_event import OutboxEvent
from infrastructure.persistence.models import OutboxEventModel


class SqlAlchemyOutboxEventRepository:
    """No hace commit — la transacción la controla quien orquesta el caso de uso
    (ver RiskRequestHandler), para que el insert del outbox quede en la misma
    unidad de trabajo que el resto de la evaluación (patrón outbox)."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def save(self, event: OutboxEvent) -> None:
        model = self._session.get(OutboxEventModel, event.id)
        if model is None:
            model = OutboxEventModel(id=event.id)
            self._session.add(model)
        model.aggregate_id = event.aggregate_id
        model.event_type = event.event_type
        model.payload = event.payload
        model.status = event.status
        model.retry_count = event.retry_count
        model.created_at = event.created_at
        model.published_at = event.published_at
        model.error = event.error
