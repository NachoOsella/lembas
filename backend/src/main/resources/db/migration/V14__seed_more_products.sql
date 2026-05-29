--
-- V14__seed_more_products.sql
--
-- Bulk seed products for catalog validation, pagination and status-flow testing.
-- Uses ON CONFLICT (barcode) DO NOTHING so re-runs are safe.
--

-- ── Alimentos Naturales ─────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Miel cruda de flores silvestres',
     'Miel pura sin procesar, recolectada en apicultura responsable.',
     'Lembas', '7790002000012', 'PUBLISHED',
     'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
     3800.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Aceite de oliva extra virgen 500ml',
     'Aceite de oliva prensado en frio, sabor frutado y aromático.',
     'Oro Verde', '7790002000029', 'PUBLISHED',
     'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
     5200.00, 15, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Quinoa organica 500g',
     'Quinoa blanca organica, lavada y lista para cocinar.',
     'Andea Foods', '7790002000036', 'PUBLISHED',
     'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
     2900.00, 20, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Avena integral en hojuelas 1kg',
     'Avena integral de cultivo natural, ideal para porridge y horneados.',
     'Lembas', '7790002000043', 'PUBLISHED',
     'https://images.unsplash.com/photo-1614961233912-a025a165746e?auto=format&fit=crop&w=800&q=80',
     1800.00, 25, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Salsa de soja sin gluten 250ml',
     'Salsa de soja fermentada naturalmente, sin aditivos artificiales.',
     'Fermenta', '7790002000050', 'PUBLISHED',
     'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80',
     2400.00, 12, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Harina de almendras 300g',
     'Harina fina de almendras tostadas, sin gluten ni azucar añadida.',
     'NutriPlant', '7790002000067', 'DRAFT',
     'https://images.unsplash.com/photo-1609580431221-14e8e68b2873?auto=format&fit=crop&w=800&q=80',
     4500.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Granola con chocolate amargo',
     'Granola crocante con trozos de chocolate amargo 70% cacao.',
     'Lembas', '7790002000074', 'PUBLISHED',
     'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?auto=format&fit=crop&w=800&q=80',
     4600.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Tahini integral 200g',
     'Pasta de sesamo integral sin sal, ideal para hummus y salsas.',
     'Oro Verde', '7790002000081', 'PAUSED',
     'https://images.unsplash.com/photo-1612187209234-a4b3b5e93a7c?auto=format&fit=crop&w=800&q=80',
     3200.00, 6, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Cacao en polvo organico 200g',
     'Cacao puro sin endulzar, rico en antioxidantes y minerales.',
     'Cacao Libre', '7790002000098', 'PUBLISHED',
     'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&w=800&q=80',
     3500.00, 14, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Cereal integral mixto 400g',
     'Mezcla de cereales integrales con semillas y frutos secos.',
     'Granja Viva', '7790002000104', 'HIDDEN',
     'https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?auto=format&fit=crop&w=800&q=80',
     2700.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Alimentos Naturales'),
     'Vinagre de manzana organico 500ml',
     'Vinagre crudo con madre, fermentado naturalmente.',
     'Fermenta', '7790002000111', 'PUBLISHED',
     'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80',
     2800.00, 8, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Hierbas ─────────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Manzanilla flores enteras 50g',
     'Manzanilla aromatica para preparaciones calientes o frias.',
     'Monte Verde', '7790003000012', 'PUBLISHED',
     'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80',
     1800.00, 15, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Te verde sencha 100g',
     'Te verde japonés de hoja entera, sabor umami suave.',
     'Monte Verde', '7790003000029', 'PUBLISHED',
     'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80',
     3200.00, 12, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Cúrcuma en polvo 100g',
     'Cúrcuma molida de alta concentración en curcumina.',
     'Raiz Viva', '7790003000036', 'PUBLISHED',
     'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
     2100.00, 18, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Jengibre deshidratado 80g',
     'Rodajas de jengibre deshidratado para infusiones y cocinas.',
     'Raiz Viva', '7790003000043', 'DRAFT',
     'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80',
     2400.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Lavanda seca 40g',
     'Flores de lavanda secas para infusiones relajantes.',
     'Aroma Lembas', '7790003000050', 'PUBLISHED',
     'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80',
     2600.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Menta spearmint 60g',
     'Hojas de menta spearmint secas, refrescantes y aromaticas.',
     'Monte Verde', '7790003000067', 'PAUSED',
     'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80',
     1900.00, 14, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Te negro earl grey 100g',
     'Te negro aromatizado con bergamota, estilo clasico.',
     'Monte Verde', '7790003000074', 'PUBLISHED',
     'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80',
     3500.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Hierbas'),
     'Rooibos natural 80g',
     'Te rooibos sudafricano natural, sin cafeina.',
     'Monte Verde', '7790003000081', 'HIDDEN',
     'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80',
     3100.00, 6, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Suplementos ─────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Colageno hidrolizado 300g',
     'Colageno bovino hidrolizado en polvo, sabor neutro.',
     'NutriPlant', '7790004000012', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     12500.00, 6, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Creatina monohidratada 500g',
     'Creatina pura para rendimiento deportivo.',
     'Fuel Sport', '7790004000029', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     8900.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Omega 3 aceite de pescado 60 caps',
     'Capsulas de aceite de pescado concentrado EPA/DHA.',
     'NutriPlant', '7790004000036', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     7200.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Vitamina D3 2000 UI 120 caps',
     'Vitamina D3 en gotas para absorcion optima.',
     'VitaLembas', '7790004000043', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     5400.00, 12, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Magnesio glicinato 200mg 60 caps',
     'Magnesio en forma altamente biodisponible.',
     'NutriPlant', '7790004000050', 'DRAFT',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     6100.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Proteina de guisante 1kg',
     'Proteina vegetal de guisante, sabor chocolate.',
     'NutriPlant', '7790004000067', 'PAUSED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     15800.00, 5, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Multivitaminico diario 60 tabs',
     'Complejo multivitaminico y mineral para el dia a dia.',
     'VitaLembas', '7790004000074', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     4800.00, 15, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Probioticos 10 cepas 30 caps',
     'Probioticos de alta potencia con 10 cepas diferentes.',
     'FloraVita', '7790004000081', 'HIDDEN',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     8200.00, 6, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'Ashwagandha KSM-66 60 caps',
     'Extracto estandarizado de ashwagandha para manejo del estres.',
     'Adaptogenic', '7790004000098', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     7600.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Suplementos'),
     'BCAA 2:1:1 polvo 300g',
     'Aminoacidos ramificados para recuperacion muscular.',
     'Fuel Sport', '7790004000104', 'PUBLISHED',
     'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80',
     9400.00, 7, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Aceites Esenciales ──────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de eucalipto 30ml',
     'Aceite esencial de eucalipto para vaporizaciones y masajes.',
     'Aroma Lembas', '7790005000012', 'PUBLISHED',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     4200.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de te tree 15ml',
     'Aceite esencial antibacteriano de Melaleuca.',
     'Aroma Lembas', '7790005000029', 'PUBLISHED',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     3800.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de naranja 30ml',
     'Aceite esencial de naranja dulce para difusor.',
     'Aroma Lembas', '7790005000036', 'PUBLISHED',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     3500.00, 12, true),

    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de romero 15ml',
     'Aceite esencial de romero para estimular la concentracion.',
     'Herbal Aroma', '7790005000043', 'DRAFT',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     5100.00, 6, true),

    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de menta 30ml',
     'Aceite esencial de menta piperita para dolores de cabeza.',
     'Aroma Lembas', '7790005000050', 'PAUSED',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     4000.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de argan 50ml',
     'Aceite vegetal de argan para cuidado capilar y facial.',
     'Raiz Natural', '7790005000067', 'PUBLISHED',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     7800.00, 5, true),

    ((SELECT id FROM categories WHERE name = 'Aceites Esenciales'),
     'Aceite de sándalo 15ml',
     'Aceite esencial de sándalo para meditación y relajación profunda.',
     'Herbal Aroma', '7790005000074', 'HIDDEN',
     'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
     12500.00, 3, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Cosmetica Natural ───────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Crema hidratante facial 50ml',
     'Crema con aloe vera y aceite de jojoba para todo tipo de piel.',
     'Raiz Natural', '7790006000012', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     6200.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Jabon artesanal de lavanda 120g',
     'Jabon elaborado artesanalmente con aceite esencial de lavanda.',
     'Manos Verdes', '7790006000029', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     2800.00, 15, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Exfoliante corporal de cafe 200g',
     'Exfoliante con cafe molido y aceite de coco.',
     'Manos Verdes', '7790006000036', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     3900.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Balsamo labial de miel 15g',
     'Balsamo labial con miel, cera de abeja y manteca de karite.',
     'Lembas Care', '7790006000043', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     1500.00, 20, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Shampoo solido de romero 80g',
     'Shampoo solido fortificante con romero y menta.',
     'Raiz Natural', '7790006000050', 'DRAFT',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     4800.00, 8, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Aceite corporal de rosa mosqueta 100ml',
     'Aceite regenerador con rosa mosqueta y vitamina E.',
     'Raiz Natural', '7790006000067', 'PAUSED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     8200.00, 5, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Desodorante natural roll-on 50ml',
     'Desodorante sin aluminio con bicarbonato y aceite de coco.',
     'Lembas Care', '7790006000074', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     3200.00, 12, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Mascarilla de arcilla verde 150g',
     'Mascarilla detoxificante con arcilla verde y aceites esenciales.',
     'Manos Verdes', '7790006000081', 'HIDDEN',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     4500.00, 6, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Agua de rosas 200ml',
     'Hidrolato de rosas para tonificar y refrescar la piel.',
     'Herbal Aroma', '7790006000098', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     3600.00, 10, true),

    ((SELECT id FROM categories WHERE name = 'Cosmetica Natural'),
     'Condicionador solido de lavanda 80g',
     'Condicionador solido con manteca de karite y lavanda.',
     'Raiz Natural', '7790006000104', 'PUBLISHED',
     'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
     4200.00, 8, true)
ON CONFLICT (barcode) DO NOTHING;
