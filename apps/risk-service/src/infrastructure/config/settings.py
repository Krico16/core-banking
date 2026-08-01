from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_host: str = "localhost"
    database_port: int = 5432
    database_username: str = "postgres"
    database_password: str = "postgres"
    database_name: str = "risk_db"

    redpanda_brokers: str = "localhost:19092"
    risk_requests_topic: str = "banking.payment.risk-requests"
    risk_events_topic: str = "banking.risk.events"

    # Límites de riesgo mínimos viables (deterministas, no ML) — reglas de negocio
    # configurables por entorno en vez de hardcodeadas.
    max_transaction_amount_cents: int = 1_000_000
    max_daily_amount_cents: int = 5_000_000

    port: int = 3006

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.database_username}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
