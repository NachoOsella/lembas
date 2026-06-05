--
-- V21__seed_suppliers.sql
--
-- Demo suppliers and product-supplier associations for Sprint 2 local development.
--

-- =============================================================================
-- Suppliers
-- =============================================================================
INSERT INTO suppliers (name, contact_name, phone, email, cuit, active)
VALUES
    ('Distribuidora Cordoba S.A.', 'Carlos Martinez', '+54 351 444-1001', 'ventas@distcordoba.com.ar', '30-71234567-8', true),
    ('Mayorista Salud Natural', 'Laura Benitez', '+54 11 5234-9900', 'laura@mayordistsalud.com', '30-69876543-2', true),
    ('Importadora Monte', 'Andrea Rios', '+54 351 477-2040', 'pedidos@importadoramonte.com', '30-55667788-9', true)
ON CONFLICT (cuit) DO NOTHING;

-- =============================================================================
-- Product-supplier associations (current replacement costs)
-- =============================================================================
INSERT INTO supplier_products (product_id, supplier_id, supplier_sku, current_cost, is_preferred, active)
SELECT
    p.id,
    s.id,
    CASE WHEN s.name = 'Distribuidora Cordoba S.A.' THEN 'DC-' || p.barcode
         WHEN s.name = 'Mayorista Salud Natural'   THEN 'MSN' || LEFT(p.barcode, 6)
         ELSE NULL
    END,
    -- realistic replacement costs below retail price
    CASE WHEN p.name LIKE 'Granola%'     THEN 2900.00
         WHEN p.name LIKE 'Yerba%'       THEN 2200.00
         WHEN p.name LIKE 'Proteina%'    THEN 5100.00
         WHEN p.name LIKE 'Miel%'        THEN 3200.00
         WHEN p.name LIKE 'Mix%'         THEN 1300.00
         WHEN p.name LIKE 'Aceite%'      THEN 2800.00
         ELSE 2500.00
    END,
    CASE WHEN s.name = 'Distribuidora Cordoba S.A.' THEN true ELSE false END,
    true
FROM products p
CROSS JOIN suppliers s
WHERE p.active = true
  AND s.active = true
  AND s.name IN ('Distribuidora Cordoba S.A.', 'Mayorista Salud Natural')
ORDER BY p.id, s.id
ON CONFLICT (product_id, supplier_id) DO NOTHING;

-- Register initial replacement cost history for every seed association.
INSERT INTO supplier_product_cost_history (supplier_product_id, old_cost, new_cost, source, reference_type, reference_id)
SELECT
    sp.id,
    NULL,
    sp.current_cost,
    'SEED',
    'SUPPLIER_PRODUCT',
    sp.id
FROM supplier_products sp
WHERE NOT EXISTS (
    SELECT 1 FROM supplier_product_cost_history h WHERE h.supplier_product_id = sp.id
);
