FROM python:3.13-slim AS builder

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.13-slim

RUN useradd --create-home --shell /usr/sbin/nologin risk

WORKDIR /app

COPY --from=builder /root/.local /home/risk/.local
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./

ENV PATH=/home/risk/.local/bin:$PATH \
    PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1

USER risk

EXPOSE 3006

CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 3006 --app-dir src"]
