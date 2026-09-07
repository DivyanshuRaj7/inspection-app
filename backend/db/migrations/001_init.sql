CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('INSPECTOR', 'OFFICIAL', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rule_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(100) UNIQUE NOT NULL,
    rules JSONB NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
    checksum VARCHAR(128) NULL,
    created_by UUID REFERENCES users(id) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one ACTIVE rule config exists
CREATE UNIQUE INDEX IF NOT EXISTS active_rule_config_idx ON rule_configs(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS rule_configs_status_eff_from_idx ON rule_configs(status, effective_from DESC);

CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_inspection_id UUID UNIQUE NOT NULL,
    inspector_id UUID REFERENCES users(id) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'COMPLETED', 'CONFLICTED')),
    product_name VARCHAR(255) NULL,
    brand_name VARCHAR(255) NULL,
    manufacturer_name VARCHAR(255) NULL,
    manufacturer_address TEXT NULL,
    packer_name VARCHAR(255) NULL,
    packer_address TEXT NULL,
    importer_name VARCHAR(255) NULL,
    importer_address TEXT NULL,
    declared_quantity VARCHAR(100) NULL,
    mrp NUMERIC(12,2) NULL,
    packed_date DATE NULL,
    expiry_date DATE NULL,
    customer_care_details TEXT NULL,
    barcode_value VARCHAR(255) NULL,
    image_references JSONB NOT NULL DEFAULT '[]',
    ocr_payload JSONB NULL,
    extracted_fields JSONB NOT NULL DEFAULT '{}',
    rule_config_version VARCHAR(100) NOT NULL,
    compliance_result JSONB NULL,
    rule_engine_status VARCHAR(30) NOT NULL DEFAULT 'NOT_EVALUATED' CHECK (rule_engine_status IN ('NOT_EVALUATED', 'PENDING', 'EVALUATED', 'FAILED')),
    client_created_at TIMESTAMPTZ NULL,
    client_updated_at TIMESTAMPTZ NOT NULL,
    server_version INTEGER NOT NULL DEFAULT 1,
    synced_at TIMESTAMPTZ NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inspections_inspector_updated_idx ON inspections(inspector_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS inspections_status_updated_idx ON inspections(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS inspections_rule_config_idx ON inspections(rule_config_version);
CREATE INDEX IF NOT EXISTS inspections_client_id_idx ON inspections(client_inspection_id);

CREATE TABLE IF NOT EXISTS inspection_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) NOT NULL,
    actor_id UUID REFERENCES users(id) NULL,
    event_type VARCHAR(60) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inspection_events_inspection_created_idx ON inspection_events(inspection_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sync_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspector_id UUID REFERENCES users(id) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(inspector_id, idempotency_key)
);
