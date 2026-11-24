import urllib.request, json, re

env = {}
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

url = env.get('SUPABASE_STORAGE_URL', '').replace('/storage/v1', '/rest/v1/')
key = env.get('SUPABASE_SERVICE_KEY', '')

req = urllib.request.Request(url, headers={
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Accept': 'application/openapi+json'
})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

defs = data.get('definitions', {})

schema_data = {
    'tables': {},
    'foreign_keys': []
}

for tname, tdef in defs.items():
    if tname == 'flyway_schema_history':
        continue
    props = tdef.get('properties', {})
    required = set(tdef.get('required', []))
    cols = []
    for cname, cdef in props.items():
        desc = cdef.get('description', '') or ''
        is_pk = '<pk/>' in desc or 'Primary Key' in desc
        fk_match = re.search(r"<fk table='([^']+)' column='([^']+)'/>", desc)
        fk_info = None
        if fk_match:
            fk_info = {'target_table': fk_match.group(1), 'target_column': fk_match.group(2)}
            schema_data['foreign_keys'].append({
                'source_table': tname,
                'source_column': cname,
                'target_table': fk_match.group(1),
                'target_column': fk_match.group(2)
            })
        
        ctype = cdef.get('format') or cdef.get('type') or 'text'
        # friendly type names
        if 'uuid' in ctype:
            ftype = 'UUID'
        elif 'varying' in ctype or 'character' in ctype:
            ftype = 'VARCHAR'
        elif 'timestamp' in ctype:
            ftype = 'TIMESTAMPTZ'
        elif 'integer' in ctype or 'int' in ctype:
            ftype = 'INT'
        elif 'boolean' in ctype or 'bool' in ctype:
            ftype = 'BOOLEAN'
        elif 'json' in ctype:
            ftype = 'JSONB'
        elif 'numeric' in ctype or 'float' in ctype:
            ftype = 'NUMERIC'
        elif 'bigint' in ctype:
            ftype = 'BIGINT'
        else:
            ftype = ctype.upper()

        cols.append({
            'name': cname,
            'type': ftype,
            'is_pk': is_pk,
            'is_fk': fk_info is not None,
            'fk_target': fk_info,
            'is_required': cname in required
        })
    schema_data['tables'][tname] = cols

with open('scripts/supabase_erd_schema.json', 'w', encoding='utf-8') as f:
    json.dump(schema_data, f, indent=2, ensure_ascii=False)

print('Saved scripts/supabase_erd_schema.json with', len(schema_data['tables']), 'tables and', len(schema_data['foreign_keys']), 'foreign keys!')

