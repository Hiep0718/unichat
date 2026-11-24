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

all_pks = {}
all_fks = []

for tname, tdef in defs.items():
    if tname == 'flyway_schema_history':
        continue
    props = tdef.get('properties', {})
    t_pks = []
    for cname, cdef in props.items():
        desc = cdef.get('description', '') or ''
        if '<pk/>' in desc or 'Primary Key' in desc:
            t_pks.append(cname)
        fk_match = re.search(r"<fk table='([^']+)' column='([^']+)'/>", desc)
        if fk_match:
            all_fks.append((tname, cname, fk_match.group(1), fk_match.group(2)))
    all_pks[tname] = t_pks

print('Total tables processed:', len(all_pks))
print('Tables with identified PKs:', len([t for t, pks in all_pks.items() if pks]))
print('Total Foreign Keys directly from Supabase DB schema:', len(all_fks))
for fk in sorted(all_fks):
    print(f'  {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]}')

