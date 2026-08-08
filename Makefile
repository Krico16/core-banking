.PHONY: up down stop status health test test-unit test-e2e test-contract test-app migrate seed lint build logs ps clean

COMPOSE_FILE := compose.yaml

up:
	docker compose -f $(COMPOSE_FILE) up -d --build

down:
	docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans

stop:
	docker compose -f $(COMPOSE_FILE) stop

status:
	docker compose -f $(COMPOSE_FILE) ps

health:
	docker compose -f $(COMPOSE_FILE) ps --format json

test: test-unit test-e2e test-contract

# Unitarios de los 9 servicios. auth-service no tiene tests todavía (deuda
# técnica documentada en CLAUDE.md) — --passWithNoTests evita que rompa la
# cadena mientras eso sigue pendiente, no lo esconde.
test-unit:
	@echo "== Unitarios NestJS (7 servicios) =="
	cd apps/auth-service && npm test -- --passWithNoTests
	cd apps/customer-service && npm test
	cd apps/account-service && npm test
	cd apps/payment-service && npm test
	cd apps/notification-service && npm test
	cd apps/query-service && npm test
	cd apps/api-gateway && npm test
	@echo "== Unitarios ledger-service (Maven vendorizado) =="
	cd apps/ledger-service && ../../tools/maven/apache-maven-3.9.6/bin/mvn test
	@echo "== Unitarios risk-service (pytest, venv propio) =="
	cd apps/risk-service && .venv/Scripts/pytest.exe

# Requiere el stack levantado (make up) — flujo completo vía api-gateway.
test-e2e:
	@echo "== E2E: flujo crítico completo contra el stack real =="
	cd tests/end-to-end && npm test

# Valida eventos contra contracts/json-schema/. Usa los eventos reales
# capturados por test-e2e si esa corrida ya dejó captured-events/latest.json
# (si no, valida solo las fixtures sintéticas — no requiere el stack).
test-contract:
	@echo "== Contrato: eventos vs. contracts/json-schema/ =="
	cd tests/contract && npm test

test-app:
	cd apps/$(name) && npm test

migrate:
	cd apps/$(name) && npm run migration:run

seed:
	@echo "== Datos de demo (requiere 'make up' con el stack ya levantado) =="
	cd tests/end-to-end && npm run seed

lint:
	@echo "Linting all services..."
	cd apps/auth-service && npm run lint
	cd apps/customer-service && npm run lint

build:
	@echo "Building all images..."
	docker compose -f $(COMPOSE_FILE) build
	docker build -t banking-auth-service:local -f apps/auth-service/Dockerfile .
	docker build -t banking-customer-service:local -f apps/customer-service/Dockerfile .
	docker build -t banking-account-service:local -f apps/account-service/Dockerfile .

# Tests por servicio
test-auth:
	cd apps/auth-service && npm test

test-customer:
	cd apps/customer-service && npm test

test-account:
	cd apps/account-service && npm test

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

logs-%:
	docker compose -f $(COMPOSE_FILE) logs -f $*

clean: down
	docker volume ls -q -f name=banking | xargs -r docker volume rm

# Conexiones de desarrollo
psql:
	psql postgresql://postgres:postgres@localhost:5432/postgres

rpk-cluster:
	rpk cluster info --brokers localhost:19092

rpk-topics:
	rpk topic list --brokers localhost:19092

# Infraestructura
infra-up:
	make up

infra-down:
	make down

infra-logs:
	make logs
