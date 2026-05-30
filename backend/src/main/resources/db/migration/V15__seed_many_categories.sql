--
-- V15__seed_many_categories.sql
--
-- Seed 25 additional categories with products to test horizontal category nav scroll.
-- Uses ON CONFLICT DO NOTHING for safe re-runs.
--

-- ── New categories ──────────────────────────────────────────────────────────
INSERT INTO categories (name, description) VALUES
    ('Tés Especiales', 'Tés con mezclas exclusivas y sabores unicos'),
    ('Frutos Secos', 'Nueces, almendras, castanas y frutos secos variados'),
    ('Semillas', 'Chia, lino, girasol, calabaza y otras semillas'),
    ('Snacks Saludables', 'Barritas, chips vegetales y snacks naturales'),
    ('Bebidas Naturales', 'Jugos, kombuchas y bebidas funcionales'),
    ('Harinas y Cereales', 'Harinas sin gluten, avena y cereales integrales'),
    ('Endulzantes Naturales', 'Miel, stevia, azucar de coco y endulzantes alternativos'),
    ('Pastas y Legumbres', 'Fideos integrales, lentejas y legumbres secas'),
    ('Aceites y Vinagres', 'Aceites prensados en frio y vinagres artesanales'),
    ('Especias y Condimentos', 'Especias molidas, mezclas y condimentos gourmet'),
    ('Productos Lacteos', 'Quesos artesanales, yogur y leches vegetales'),
    ('Panaderia Artesanal', 'Panes integrales, galletas y bizcochos naturales'),
    ('Congelados Naturales', 'Helados artesanales y vegetales sin aditivos'),
    ('Bebidas Proteicas', 'Batidos y shakes proteinosos vegetales'),
    ('Cuidado del Cabello', 'Shampoos, acondicionadores y tratamientos capilares'),
    ('Cuidado de la Piel', 'Cremas, serum y protectores solares naturales'),
    ('Aromaterapia', 'Difusores, velas aromaticas y aceites para masaje'),
    ('Yoga y Bienestar', 'Esterillas, bloques y accesorios de meditacion'),
    ('Mascotas Naturales', 'Alimentos y cuidado natural para mascotas'),
    ('Bebes y Ninos', 'Alimentos y cuidado natural para la familia'),
    ('Cocina Saludable', 'Utensilios y herramientas para cocina natural'),
    ('Regalos y Kits', 'Cajas regalo y kits de productos seleccionados'),
    ('Ofertas del Mes', 'Productos con descuento especial del mes'),
    ('Novedades', 'Productos nuevos recien llegados al catalogo'),
    ('Temporada', 'Productos estacionales y ediciones limitadas')
ON CONFLICT DO NOTHING;

-- ── Products for Tés Especiales ─────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Tés Especiales'),
     'Te chai especiado 100g', 'Mezcla de te negro con canela, cardamomo y jengibre.', 'Monte Verde', '7790007000012', 'PUBLISHED', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80', 3800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Tés Especiales'),
     'Te de frutos rojos 80g', 'Infusion sin cafeina con frambuesa, mora y arandanos.', 'Monte Verde', '7790007000029', 'PUBLISHED', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80', 3400.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Tés Especiales'),
     'Te verde matcha 50g', 'Matcha ceremonial japonés de alta calidad.', 'Te Premium', '7790007000036', 'PUBLISHED', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80', 8900.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Tés Especiales'),
     'Te blanco pekoe 60g', 'Te blanco delicado con notas florales sutiles.', 'Monte Verde', '7790007000043', 'PUBLISHED', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80', 5200.00, 5, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Frutos Secos ───────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Frutos Secos'),
     'Nueces mixtas 200g', 'Mezcla de nueces, almendras y avellanas tostadas.', 'Frutos Vivos', '7790007000050', 'PUBLISHED', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=800&q=80', 4200.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Frutos Secos'),
     'Almendras crudas 250g', 'Almendras enteras crudas, sin sal ni conservantes.', 'Frutos Vivos', '7790007000067', 'PUBLISHED', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=800&q=80', 3800.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Frutos Secos'),
     'Castanas de caju 200g', 'Castanas de caju tostadas ligeramente.', 'Frutos Vivos', '7790007000074', 'PUBLISHED', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=800&q=80', 5100.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Frutos Secos'),
     'Avellanas tostadas 150g', 'Avellanas tostadas peladas, crujientes y aromaticas.', 'Frutos Vivos', '7790007000081', 'PUBLISHED', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=800&q=80', 4600.00, 8, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Semillas ────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Semillas'),
     'Semillas de chia 300g', 'Semillas de chia organicas ricas en omega 3.', 'Semillas del Sol', '7790007000098', 'PUBLISHED', 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80', 2800.00, 20, true),
    ((SELECT id FROM categories WHERE name = 'Semillas'),
     'Semillas de lino molido 200g', 'Lineza molida para mejor absorcion de nutrientes.', 'Semillas del Sol', '7790007000104', 'PUBLISHED', 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80', 2200.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Semillas'),
     'Semillas de girasol 250g', 'Semillas de girasol peladas, snack saludable.', 'Semillas del Sol', '7790007000111', 'PUBLISHED', 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80', 2000.00, 18, true),
    ((SELECT id FROM categories WHERE name = 'Semillas'),
     'Semillas de calabaza 200g', 'Pepitoria tostada sin sal, fuente de magnesio.', 'Semillas del Sol', '7790007000118', 'PUBLISHED', 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80', 2400.00, 12, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Snacks Saludables ──────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Snacks Saludables'),
     'Barrita de granola con miel 40g', 'Barrita crujiente con avena, frutos secos y miel.', 'Snack Natural', '7790007000125', 'PUBLISHED', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80', 1200.00, 25, true),
    ((SELECT id FROM categories WHERE name = 'Snacks Saludables'),
     'Chips de remolacha 50g', 'Chips deshidratados de remolacha sin aditivos.', 'Verde Snack', '7790007000132', 'PUBLISHED', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80', 1800.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Snacks Saludables'),
     'Mix trail 150g', 'Mezcla de frutos secos, semillas y chocolate amargo.', 'Snack Natural', '7790007000139', 'PUBLISHED', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80', 3200.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Snacks Saludables'),
     'Crackers integrales 120g', 'Crackers de harina integral con semillas de sesamo.', 'Pan Saludable', '7790007000146', 'PUBLISHED', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80', 2100.00, 12, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Bebidas Naturales ───────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Bebidas Naturales'),
     'Kombucha de jengibre 330ml', 'Bebida fermentada con jengibre y limon.', 'Fermenta', '7790007000153', 'PUBLISHED', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80', 2400.00, 20, true),
    ((SELECT id FROM categories WHERE name = 'Bebidas Naturales'),
     'Jugo verde detox 500ml', 'Jugo de apio, pepino, manzana y limon.', 'Jugos Vivos', '7790007000160', 'PUBLISHED', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80', 3200.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Bebidas Naturales'),
     'Leche de almendras 1L', 'Bebida vegetal de almendras sin azucar añadida.', 'Bebidas Vivas', '7790007000167', 'PUBLISHED', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80', 2800.00, 18, true),
    ((SELECT id FROM categories WHERE name = 'Bebidas Naturales'),
     'Agua de coco 330ml', 'Agua de coco pura sin azucar.', 'Coco Puro', '7790007000174', 'PUBLISHED', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80', 1900.00, 25, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Harinas y Cereales ─────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Harinas y Cereales'),
     'Harina de avena 500g', 'Harina fina de avena integral, sin gluten.', 'Harinas Vivas', '7790007000181', 'PUBLISHED', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80', 2200.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Harinas y Cereales'),
     'Harina de coco 300g', 'Harina de coco deshidratada, ideal para reposteria.', 'Harinas Vivas', '7790007000188', 'PUBLISHED', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80', 3400.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Harinas y Cereales'),
     'Muesli integral 500g', 'Mezcla de cereales integrales con frutas deshidratadas.', 'Granja Viva', '7790007000195', 'PUBLISHED', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80', 3100.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Harinas y Cereales'),
     'Polenta integral 500g', 'Polenta de maiz integral molienda fina.', 'Harinas Vivas', '7790007000201', 'PUBLISHED', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80', 1800.00, 20, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Endulzantes Naturales ───────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Endulzantes Naturales'),
     'Miel de bosque 500g', 'Miel pura de bosque sin procesar.', 'Miel Real', '7790007000208', 'PUBLISHED', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', 5800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Endulzantes Naturales'),
     'Azucar de coco 250g', 'Azucar de coco organica con bajo indice glucemico.', 'Dulce Natural', '7790007000215', 'PUBLISHED', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', 3200.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Endulzantes Naturales'),
     'Stevia en polvo 100g', 'Extracto de stevia pura sin aditivos.', 'Dulce Natural', '7790007000222', 'PUBLISHED', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', 4100.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Endulzantes Naturales'),
     'Sirope de agave 350ml', 'Sirope de agave organico, endulzante natural.', 'Dulce Natural', '7790007000229', 'PUBLISHED', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', 3600.00, 10, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Pastas y Legumbres ─────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Pastas y Legumbres'),
     'Fideos integrales 400g', 'Fideos de trigo integral, coccion rapida.', 'Pasta Viva', '7790007000236', 'PUBLISHED', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80', 2100.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Pastas y Legumbres'),
     'Lentejas rojas 500g', 'Lentejas rojas descascarilladas, coccion rapida.', 'Legumbres Vivas', '7790007000243', 'PUBLISHED', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80', 1800.00, 20, true),
    ((SELECT id FROM categories WHERE name = 'Pastas y Legumbres'),
     'Garbanzos secos 500g', 'Garbanzos enteros para hummus y guisos.', 'Legumbres Vivas', '7790007000250', 'PUBLISHED', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80', 2000.00, 18, true),
    ((SELECT id FROM categories WHERE name = 'Pastas y Legumbres'),
     'Quinoa tricolor 400g', 'Mezcla de quinoa blanca, roja y negra.', 'Andea Foods', '7790007000257', 'PUBLISHED', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80', 3400.00, 10, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Aceites y Vinagres ──────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Aceites y Vinagres'),
     'Aceite de oliva virgen extra 1L', 'AOVE prensado en frio, sabor intenso.', 'Oro Verde', '7790007000264', 'PUBLISHED', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80', 8200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Aceites y Vinagres'),
     'Vinagre balsamico 250ml', 'Vinagre balsamico de Modena envejecido.', 'Vinagres Finos', '7790007000271', 'PUBLISHED', 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80', 4800.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Aceites y Vinagres'),
     'Aceite de linaza 250ml', 'Aceite de linaza prensado en frio, rico en omega 3.', 'Oro Verde', '7790007000278', 'PUBLISHED', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80', 3600.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Aceites y Vinagres'),
     'Vinagre de manzana 500ml', 'Vinagre crudo con madre, organico.', 'Fermenta', '7790007000285', 'PUBLISHED', 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80', 2800.00, 10, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Especias y Condimentos ──────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Especias y Condimentos'),
     'Pimenton ahumado 100g', 'Pimenton ahumado de la Vera, sabor intenso.', 'Especias Vivas', '7790007000292', 'PUBLISHED', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', 3200.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Especias y Condimentos'),
     'Curry amarillo 80g', 'Mezcla de curry amarillo con curcuma y comino.', 'Especias Vivas', '7790007000299', 'PUBLISHED', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', 2800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Especias y Condimentos'),
     'Origeno seco 50g', 'Origeno seco aromatico para pizzas y pastas.', 'Especias Vivas', '7790007000305', 'PUBLISHED', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', 2200.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Especias y Condimentos'),
     'Comino molido 60g', 'Comino molido de alta pureza.', 'Especias Vivas', '7790007000312', 'PUBLISHED', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80', 2000.00, 18, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Productos Lacteos ───────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Productos Lacteos'),
     'Queso cremoso artesanal 200g', 'Queso cremoso elaborado artesanalmente con leche de vaca.', 'Lacteos Vivos', '7790007000319', 'PUBLISHED', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80', 4200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Productos Lacteos'),
     'Yogur natural 500g', 'Yogur natural sin endulzar, con cultivos vivos.', 'Lacteos Vivos', '7790007000326', 'PUBLISHED', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80', 2400.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Productos Lacteos'),
     'Leche entera 1L', 'Leche entera pasteurizada de vacas criadas en pastura.', 'Lacteos Vivos', '7790007000333', 'PUBLISHED', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80', 1800.00, 20, true),
    ((SELECT id FROM categories WHERE name = 'Productos Lacteos'),
     'Ricotta fresca 250g', 'Ricotta fresca elaborada artesanalmente.', 'Lacteos Vivos', '7790007000340', 'PUBLISHED', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=800&q=80', 2600.00, 10, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Panaderia Artesanal ─────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Panaderia Artesanal'),
     'Pan integral de centeno 500g', 'Pan de centeno integral con semillas.', 'Pan Vivo', '7790007000347', 'PUBLISHED', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 3200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Panaderia Artesanal'),
     'Galletas de avena 200g', 'Galletas de avena con miel y pasas.', 'Pan Vivo', '7790007000354', 'PUBLISHED', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 2400.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Panaderia Artesanal'),
     'Chipa de almidon 300g', 'Chipa tradicional de almidon y queso.', 'Pan Vivo', '7790007000361', 'PUBLISHED', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 2800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Panaderia Artesanal'),
     'Bizcocho de maizena 250g', 'Bizcocho crujiente de maizena con azucar impalpable.', 'Pan Vivo', '7790007000368', 'PUBLISHED', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', 2200.00, 15, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Congelados Naturales ────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Congelados Naturales'),
     'Helado de vainilla 500ml', 'Helado artesanal de vainilla con leche y crema.', 'Frio Natural', '7790007000375', 'PUBLISHED', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80', 4800.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Congelados Naturales'),
     'Helado de dulce de leche 500ml', 'Helado artesanal de dulce de leche cremoso.', 'Frio Natural', '7790007000382', 'PUBLISHED', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80', 5200.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Congelados Naturales'),
     'Helado de frutos del bosque 500ml', 'Helado vegano de frutos del bosque sin lactosa.', 'Frio Natural', '7790007000389', 'PUBLISHED', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80', 5400.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Congelados Naturales'),
     'Helado de chocolate 500ml', 'Helado intenso de chocolate amargo 70% cacao.', 'Frio Natural', '7790007000396', 'PUBLISHED', 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80', 5000.00, 7, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Bebidas Proteicas ───────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Bebidas Proteicas'),
     'Batido proteico chocolate 1kg', 'Proteina vegetal sabor chocolate para batidos.', 'Fuel Sport', '7790007000402', 'PUBLISHED', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 15800.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Bebidas Proteicas'),
     'Batido proteico vainilla 1kg', 'Proteina de guisante sabor vainilla.', 'Fuel Sport', '7790007000409', 'PUBLISHED', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 15800.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Bebidas Proteicas'),
     'Shake verde proteico 300g', 'Mezcla de proteina verde con espirulina y matcha.', 'Fuel Sport', '7790007000416', 'PUBLISHED', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 8900.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Bebidas Proteicas'),
     'Colageno hidrolizado polvo 300g', 'Colageno bovino hidrolizado sabor neutro.', 'NutriPlant', '7790007000423', 'PUBLISHED', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 12500.00, 4, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Cuidado del Cabello ─────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Cuidado del Cabello'),
     'Shampoo de romero 250ml', 'Shampoo fortificante con extracto de romero.', 'Raiz Natural', '7790007000430', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 3800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Cuidado del Cabello'),
     'Acondicionador de karite 250ml', 'Acondicionador hidratante con manteca de karite.', 'Raiz Natural', '7790007000437', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 4200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Cuidado del Cabello'),
     'Aceite capilar de argan 100ml', 'Aceite de argan puro para puntas y brillo.', 'Raiz Natural', '7790007000444', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 6800.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Cuidado del Cabello'),
     'Mascarilla de keratina 200g', 'Tratamiento profundo con keratina vegetal.', 'Raiz Natural', '7790007000451', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 5400.00, 5, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Cuidado de la Piel ──────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Cuidado de la Piel'),
     'Serum de vitamina C 30ml', 'Serum antioxidante con vitamina C pura.', 'Raiz Natural', '7790007000458', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 7200.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Cuidado de la Piel'),
     'Crema solar SPF50 100ml', 'Protector solar mineral sin quimicos agresivos.', 'Raiz Natural', '7790007000465', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 8400.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Cuidado de la Piel'),
     'Agua micelar 200ml', 'Agua micelar suave para limpieza facial.', 'Lembas Care', '7790007000472', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 3600.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Cuidado de la Piel'),
     'Contorno de ojos 15ml', 'Contorno de ojos anti-edad con acido hialuronico.', 'Raiz Natural', '7790007000479', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 6200.00, 4, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Aromaterapia ────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Aromaterapia'),
     'Difusor ultrasonico 300ml', 'Difusor de aceites esenciales con luz LED.', 'Aroma Lembas', '7790007000486', 'PUBLISHED', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 8900.00, 4, true),
    ((SELECT id FROM categories WHERE name = 'Aromaterapia'),
     'Vela aromatica de lavanda 200g', 'Vela de soja con aceite esencial de lavanda.', 'Aroma Lembas', '7790007000493', 'PUBLISHED', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 4200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Aromaterapia'),
     'Aceite para masaje 100ml', 'Aceite de almendras dulces con aroma a ylang-ylang.', 'Aroma Lembas', '7790007000500', 'PUBLISHED', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 5600.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Aromaterapia'),
     'Spray Pillow 100ml', 'Spray para almohadas con lavanda y manzanilla.', 'Aroma Lembas', '7790007000507', 'PUBLISHED', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 3200.00, 10, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Yoga y Bienestar ────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Yoga y Bienestar'),
     'Esterilla de yoga 6mm', 'Esterilla antideslizante de caucho natural.', 'Zen Vida', '7790007000514', 'PUBLISHED', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', 12800.00, 3, true),
    ((SELECT id FROM categories WHERE name = 'Yoga y Bienestar'),
     'Bloque de yoga 23cm', 'Bloque de corcho para practica de yoga.', 'Zen Vida', '7790007000521', 'PUBLISHED', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', 4200.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Yoga y Bienestar'),
     'Cojin de meditacion 30cm', 'Cojin relleno de semillas de lino para meditacion.', 'Zen Vida', '7790007000528', 'PUBLISHED', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', 5800.00, 4, true),
    ((SELECT id FROM categories WHERE name = 'Yoga y Bienestar'),
     'Manta de meditacion 150x200cm', 'Manta de algodon organico para practica.', 'Zen Vida', '7790007000535', 'PUBLISHED', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', 8400.00, 3, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Mascotas Naturales ──────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Mascotas Naturales'),
     'Alimento balanceado natural 2kg', 'Alimento para perros con ingredientes naturales.', 'Pet Natural', '7790007000542', 'PUBLISHED', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80', 6800.00, 6, true),
    ((SELECT id FROM categories WHERE name = 'Mascotas Naturales'),
     'Snack dental natural 150g', 'Snacks para limpieza dental natural de perros.', 'Pet Natural', '7790007000549', 'PUBLISHED', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80', 2400.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Mascotas Naturales'),
     'Shampoo para mascotas 250ml', 'Shampoo suave con aloe vera para perros y gatos.', 'Pet Natural', '7790007000556', 'PUBLISHED', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80', 3200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Mascotas Naturales'),
     'Juguete de cuerda natural 30cm', 'Juguete masticable de cuerda de algodon.', 'Pet Natural', '7790007000563', 'PUBLISHED', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=800&q=80', 1800.00, 12, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Bebes y Ninos ───────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Bebes y Ninos'),
     'Puré de manzana orgánico 120g', 'Puré de manzana sin azúcar para bebés.', 'Bebé Natural', '7790007000570', 'PUBLISHED', 'https://images.unsplash.com/photo-1589735900942-28650ce4810e?auto=format&fit=crop&w=800&q=80', 1200.00, 20, true),
    ((SELECT id FROM categories WHERE name = 'Bebes y Ninos'),
     'Galletas de arroz para bebes 100g', 'Galletas de arroz sin gluten ni azúcar añadida.', 'Bebé Natural', '7790007000577', 'PUBLISHED', 'https://images.unsplash.com/photo-1589735900942-28650ce4810e?auto=format&fit=crop&w=800&q=80', 1400.00, 15, true),
    ((SELECT id FROM categories WHERE name = 'Bebes y Ninos'),
     'Aceite de masaje bebé 100ml', 'Aceite de calendula suave para piel sensible.', 'Bebé Natural', '7790007000584', 'PUBLISHED', 'https://images.unsplash.com/photo-1589735900942-28650ce4810e?auto=format&fit=crop&w=800&q=80', 2800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Bebes y Ninos'),
     'Shampoo sin lágrimas 200ml', 'Shampoo suave sin lágrimas para niños.', 'Bebé Natural', '7790007000591', 'PUBLISHED', 'https://images.unsplash.com/photo-1589735900942-28650ce4810e?auto=format&fit=crop&w=800&q=80', 2200.00, 12, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Cocina Saludable ────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Cocina Saludable'),
     'Exprimidor de limon manual', 'Exprimidor manual de acero inoxidable.', 'Cocina Viva', '7790007000598', 'PUBLISHED', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80', 4800.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Cocina Saludable'),
     'Jarron medidor de vidrio 1L', 'Jarron medidor de vidrio resistente al calor.', 'Cocina Viva', '7790007000605', 'PUBLISHED', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80', 3200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Cocina Saludable'),
     'Filtra agua 2.5L', 'Jarro filtrador con carbón activado.', 'Cocina Viva', '7790007000612', 'PUBLISHED', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80', 6400.00, 4, true),
    ((SELECT id FROM categories WHERE name = 'Cocina Saludable'),
     'Set de utensilios bambu 6 piezas', 'Cucharas y espátulas de bambu ecológico.', 'Cocina Viva', '7790007000619', 'PUBLISHED', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80', 5200.00, 6, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Regalos y Kits ──────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Regalos y Kits'),
     'Kit bienestar aromaterapia', 'Set de aceites esenciales: lavanda, eucalipto y menta.', 'Aroma Lembas', '7790007000626', 'PUBLISHED', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 9800.00, 4, true),
    ((SELECT id FROM categories WHERE name = 'Regalos y Kits'),
     'Caja regalo del campo', 'Miel, granola, aceite de oliva y té en caja de madera.', 'Lembas', '7790007000633', 'PUBLISHED', 'https://images.unsplash.com/photo-1549465220-8a80f536c6ef?auto=format&fit=crop&w=800&q=80', 14500.00, 3, true),
    ((SELECT id FROM categories WHERE name = 'Regalos y Kits'),
     'Kit cuidado personal', 'Jabón, crema hidratante y bálsamo labial natural.', 'Lembas Care', '7790007000640', 'PUBLISHED', 'https://images.unsplash.com/photo-1549465220-8a80f536c6ef?auto=format&fit=crop&w=800&q=80', 8200.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Regalos y Kits'),
     'Caja desayuno saludable', 'Avena, miel, frutos secos y té para un desayuno completo.', 'Lembas', '7790007000647', 'PUBLISHED', 'https://images.unsplash.com/photo-1549465220-8a80f536c6ef?auto=format&fit=crop&w=800&q=80', 7600.00, 4, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Ofertas del Mes ─────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Ofertas del Mes'),
     'Miel cruda 1kg (oferta)', 'Miel cruda de flores silvestres, precio especial del mes.', 'Lembas', '7790007000654', 'PUBLISHED', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80', 6800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Ofertas del Mes'),
     'Proteina vegetal 1kg (oferta)', 'Proteina de guisante sabor chocolate, descuento del mes.', 'Fuel Sport', '7790007000661', 'PUBLISHED', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 12800.00, 5, true),
    ((SELECT id FROM categories WHERE name = 'Ofertas del Mes'),
     'Aceite oliva 1L (oferta)', 'AOVE prensado en frío, precio de lanzamiento.', 'Oro Verde', '7790007000668', 'PUBLISHED', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80', 6400.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Ofertas del Mes'),
     'Kit bienestar (oferta)', 'Set de aceites esenciales con difusor incluido.', 'Aroma Lembas', '7790007000675', 'PUBLISHED', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 14900.00, 3, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Novedades ───────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Novedades'),
     'Te matcha ceremonial 50g', 'Nuevo: matcha de cultivo japonés de primera cosecha.', 'Te Premium', '7790007000682', 'PUBLISHED', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80', 12500.00, 3, true),
    ((SELECT id FROM categories WHERE name = 'Novedades'),
     'Colágeno marino 300g', 'Nuevo: colágeno de pescado con vitamina C.', 'NutriPlant', '7790007000689', 'PUBLISHED', 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=800&q=80', 14200.00, 4, true),
    ((SELECT id FROM categories WHERE name = 'Novedades'),
     'Kombucha de jengibre 1L', 'Nuevo: kombucha familiar de jengibre y limón.', 'Fermenta', '7790007000696', 'PUBLISHED', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80', 4800.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Novedades'),
     'Shampoo sólido de romero 80g', 'Nuevo: shampoo sólido zero waste con romero.', 'Raiz Natural', '7790007000702', 'PUBLISHED', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 4200.00, 6, true)
ON CONFLICT (barcode) DO NOTHING;

-- ── Products for Temporada ───────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, brand_name, barcode, online_status, image_url, sale_price, minimum_stock, active) VALUES
    ((SELECT id FROM categories WHERE name = 'Temporada'),
     'Chocolate caliente orgánico 200g', 'Edición invierno: chocolate para preparar con leche.', 'Cacao Libre', '7790007000709', 'PUBLISHED', 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&w=800&q=80', 3800.00, 10, true),
    ((SELECT id FROM categories WHERE name = 'Temporada'),
     'Sopa de calabaza 500ml', 'Edición invierno: sopa cremosa de calabaza y jengibre.', 'Cocina Viva', '7790007000716', 'PUBLISHED', 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&w=800&q=80', 3200.00, 8, true),
    ((SELECT id FROM categories WHERE name = 'Temporada'),
     'Té de invierno 100g', 'Edición invierno: mezcla de canela, clavo y naranja.', 'Monte Verde', '7790007000723', 'PUBLISHED', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80', 3600.00, 12, true),
    ((SELECT id FROM categories WHERE name = 'Temporada'),
     'Mermelada de frutos del bosque 250g', 'Edición verano: mermelada sin azúcar añadida.', 'Dulce Natural', '7790007000730', 'PUBLISHED', 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80', 2800.00, 10, true)
ON CONFLICT (barcode) DO NOTHING;
