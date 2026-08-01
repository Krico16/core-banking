.PHONY: up down stop status health test test-app migrate seed lint build logs ps clean

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

test:
	@echo "Running all tests..."
	# TODO: implement per-service test runner

test-app:
	cd apps/$(name) && npm test

migrate:
	cd apps/$(name) && npm run migration:run

seed:
	@echo "Loading seed data..."
	# TODO: implement seed script

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
