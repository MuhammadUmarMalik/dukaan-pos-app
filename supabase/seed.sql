-- Reference data. Safe to run repeatedly.
insert into public.plans (id, name, price_pkr, limits, store_products, sort) values
 ('basic',    'Basic',    500,  '{"users":1,"products":500,"reports":"daily","catalog":false,"export":false,"sms":0}',
   '{"google":"dukaan_basic_monthly","apple":"dukaan_basic_monthly"}', 1),
 ('standard', 'Standard', 900,  '{"users":3,"products":null,"reports":"all","catalog":false,"export":true,"sms":100}',
   '{"google":"dukaan_standard_monthly","apple":"dukaan_standard_monthly"}', 2),
 ('pro',      'Pro',      1500, '{"users":10,"products":null,"reports":"all","catalog":true,"export":true,"sms":500}',
   '{"google":"dukaan_pro_monthly","apple":"dukaan_pro_monthly"}', 3)
on conflict (id) do update set name = excluded.name, price_pkr = excluded.price_pkr,
  limits = excluded.limits, store_products = excluded.store_products, sort = excluded.sort;

insert into public.business_templates (key, version, name, name_ur, published, config) values
 ('grocery',  1, 'Grocery',        'کریانہ',        true, '{"saleMode":["piece","weight","carton"],"units":["pcs","kg","dozen","carton"],"barcode":true,"expiry":true,"starter":["Rice","Oil","Sugar","Tea","Dairy","Snacks"],"special":"supplierOrders","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('bakery',   1, 'Bakery',         'بیکری',         true, '{"saleMode":["piece","weight"],"units":["pcs","kg","dozen","box"],"barcode":false,"expiry":true,"starter":["Bread","Cakes","Biscuits","Sweets","Snacks"],"special":"quickGrid","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('milk',     1, 'Milk and Dairy', 'دودھ دہی',      true, '{"saleMode":["litre","kg"],"units":["litre","kg","pcs"],"barcode":false,"expiry":true,"starter":["Milk","Yogurt","Butter","Cream","Eggs"],"special":"dailyCustomers","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('shoes',    1, 'Shoes',          'جوتے',          true, '{"saleMode":["pair"],"units":["pair"],"barcode":true,"expiry":false,"starter":["Men","Women","Kids","Sports","Sandals"],"special":"variants","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('garments', 1, 'Garments',       'کپڑے',          true, '{"saleMode":["piece","metre"],"units":["pcs","metre","suit"],"barcode":true,"expiry":false,"starter":["Unstitched","Ready-made","Kids","Fabric"],"special":"variants","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('fruit',    1, 'Fruit and Veg',  'فروٹ سبزی',     true, '{"saleMode":["weight","dozen"],"units":["kg","dozen","piece"],"barcode":false,"expiry":false,"starter":["Fruit","Vegetables","Leafy","Dry fruit"],"special":"dailyRates","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('pharmacy', 1, 'Pharmacy',       'میڈیکل اسٹور',  true, '{"saleMode":["strip","box","piece"],"units":["strip","box","bottle"],"barcode":true,"expiry":true,"starter":["Tablets","Syrups","Injections","Care"],"special":"batchExpiry","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('mobile',   1, 'Mobile Shop',    'موبائل شاپ',    true, '{"saleMode":["piece"],"units":["pcs"],"barcode":true,"expiry":false,"starter":["Phones","Covers","Chargers","Cards"],"special":"imei","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('hardware', 1, 'Hardware',       'ہارڈویئر',      true, '{"saleMode":["piece","foot","kg"],"units":["pcs","foot","kg","bag"],"barcode":true,"expiry":false,"starter":["Pipes","Paint","Tools","Electric","Fittings"],"special":"contractorKhata","receipt":{"paper":"58mm","lang":["ur","en"]}}'),
 ('other',    1, 'Other',          'دیگر',          true, '{"saleMode":["piece"],"units":["pcs","kg"],"barcode":false,"expiry":false,"starter":[],"special":"none","receipt":{"paper":"58mm","lang":["ur","en"]}}')
on conflict (key, version) do update set name = excluded.name, name_ur = excluded.name_ur,
  config = excluded.config, published = excluded.published;
