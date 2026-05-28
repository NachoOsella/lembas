--
-- V13__fix_demo_product_categories.sql
--
-- Repairs demo product categories in local databases where the seed category was
-- manually removed before V12 ran.
--

INSERT INTO categories (name, description)
SELECT 'Aceites Esenciales', 'Aceites esenciales y aromaterapia'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Aceites Esenciales');

UPDATE products
SET category_id = (SELECT id FROM categories WHERE name = 'Aceites Esenciales' ORDER BY id LIMIT 1)
WHERE barcode = '7790001000043'
  AND category_id IS NULL;
