-- Inicialización de bases de datos por servicio
-- Cada servicio es dueño de su propia base de datos.
-- En desarrollo local se ejecuta un único servidor PostgreSQL con bases de datos separadas.

CREATE DATABASE auth_db;
CREATE DATABASE customer_db;
CREATE DATABASE account_db;
CREATE DATABASE ledger_db;
CREATE DATABASE payment_db;
CREATE DATABASE risk_db;
CREATE DATABASE notification_db;
CREATE DATABASE query_db;

-- Usuarios de servicio (uno por base de datos) para reforzar aislamiento
CREATE USER auth_user WITH PASSWORD 'auth_pass';
CREATE USER customer_user WITH PASSWORD 'customer_pass';
CREATE USER account_user WITH PASSWORD 'account_pass';
CREATE USER ledger_user WITH PASSWORD 'ledger_pass';
CREATE USER payment_user WITH PASSWORD 'payment_pass';
CREATE USER risk_user WITH PASSWORD 'risk_pass';
CREATE USER notification_user WITH PASSWORD 'notification_pass';
CREATE USER query_user WITH PASSWORD 'query_pass';

GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;
GRANT ALL PRIVILEGES ON DATABASE customer_db TO customer_user;
GRANT ALL PRIVILEGES ON DATABASE account_db TO account_user;
GRANT ALL PRIVILEGES ON DATABASE ledger_db TO ledger_user;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_user;
GRANT ALL PRIVILEGES ON DATABASE risk_db TO risk_user;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_user;
GRANT ALL PRIVILEGES ON DATABASE query_db TO query_user;
