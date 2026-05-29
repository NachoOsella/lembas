--
-- V12__seed_products.sql
--
-- Demo products for local development and admin catalog validation.
--

INSERT INTO products (
    category_id,
    name,
    description,
    brand_name,
    barcode,
    online_status,
    image_url,
    sale_price,
    minimum_stock,
    active
) VALUES
    (
        (SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
        'Granola artesanal con almendras',
        'Granola horneada con avena integral, almendras y semillas seleccionadas.',
        'Lembas',
        '7790001000012',
        'PUBLISHED',
        'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?auto=format&fit=crop&w=800&q=80',
        4200.00,
        8,
        true
    ),
    (
        (SELECT id FROM categories WHERE name = 'Hierbas'),
        'Yerba mate organica suave',
        'Yerba mate organica de estacionamiento natural, sabor suave y equilibrado.',
        'Monte Verde',
        '7790001000029',
        'PUBLISHED',
        'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
        3100.00,
        12,
        true
    ),
    (
        (SELECT id FROM categories WHERE name = 'Suplementos'),
        'Proteina vegetal vainilla',
        'Blend de proteina vegetal sabor vainilla, apto para preparaciones frias o calientes.',
        'NutriPlant',
        '7790001000036',
        'DRAFT',
        'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
        18500.00,
        5,
        true
    ),
    (
        (SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
        'Aceite esencial de lavanda',
        'Aceite esencial puro para aromaterapia y rutinas de bienestar.',
        'Aroma Lembas',
        '7790001000043',
        'PAUSED',
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
        6900.00,
        4,
        true
    ),
    (
        (SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
        'Shampoo solido nutritivo',
        'Shampoo solido con ingredientes naturales para uso diario.',
        'Raiz Natural',
        '7790001000050',
        'HIDDEN',
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
        5300.00,
        6,
        true
    )
ON CONFLICT (barcode) DO NOTHING;
