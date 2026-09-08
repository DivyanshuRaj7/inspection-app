CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode_value VARCHAR(255) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NULL,
    manufacturer_name VARCHAR(255) NULL,
    declared_quantity VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) NULL;

CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode_value);
