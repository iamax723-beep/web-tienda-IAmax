INSERT INTO stores (
    id, name, api_type, api_url, purchase_url, api_key, auth_type, auth_header, products_path, field_mapping, enabled
)
VALUES (
    '50000000-0000-0000-0000-000000000001',
    'PiggyAi',
    'generic_json',
    'https://canboso.com/api/v2/telegram-buyer/products',
    'https://canboso.com/api/v2/telegram-buyer/purchase',
    'tgb_c1f45aca0fee5be36d32a3afb4c642ecfb7f6c667678f5ab',
    'header',
    'Authorization',
    '', 
    '{"id": "id", "name": "name", "description": "description", "price": "price", "image": "image"}',
    true
)
ON CONFLICT (id) DO NOTHING;
