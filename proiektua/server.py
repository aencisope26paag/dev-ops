import http.server
import urllib.request
import json
import ssl
import os

ctx = ssl._create_unverified_context()

BASE_PERKS = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images'
BASE_UI = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/images'

# Rutas verificadas de los iconos reales del cliente de LoL en CommunityDragon
REAL_ICONS = {
    'ad': [
        f'{BASE_PERKS}/statmods/statmodsattackdamageicon.png',
        f'{BASE_UI}/stat-icons/ad.png'
    ],
    'ap': [
        f'{BASE_PERKS}/statmods/statmodsabilitypowericon.png',
        f'{BASE_UI}/stat-icons/ap.png'
    ],
    'armor': [
        f'{BASE_PERKS}/statmods/statmodsarmoricon.png'
    ],
    'mr': [
        f'{BASE_PERKS}/statmods/statmodsmagicresicon.png'
    ],
    'hp': [
        f'{BASE_PERKS}/statmods/statmodshealthplusicon.png',
        f'{BASE_PERKS}/statmods/statmodshealthscalingicon.png'
    ],
    'as': [
        f'{BASE_PERKS}/statmods/statmodsattackspeedicon.png'
    ],
    'heal': [
        f'{BASE_PERKS}/styles/resolve/revitalize/revitalize.png',
        f'{BASE_PERKS}/styles/precision/overheal.png'
    ],
    'shield': [
        f'{BASE_PERKS}/styles/sorcery/nullifyingorb/pokeshield.png',
        f'{BASE_PERKS}/styles/resolve/shieldbash/shieldbash.png'
    ],
    'mana': [
        f'{BASE_PERKS}/styles/sorcery/manaflowband/manaflowband.png',
        f'{BASE_PERKS}/styles/precision/presenceofmind/presenceofmind.png'
    ],
    'lethality': [
        f'{BASE_PERKS}/styles/domination/suddenimpact/suddenimpact.png',
        f'{BASE_PERKS}/statmods/statmodsadaptiveforceicon.png'
    ],
    'onhit': [
        f'{BASE_PERKS}/styles/precision/presstheattack/presstheattack.png',
        f'{BASE_PERKS}/styles/domination/hailofblades/hailofblades.png'
    ]
}

def download_real_icons():
    os.makedirs('icons', exist_ok=True)
    headers = {'User-Agent': 'Mozilla/5.0'}
    for name, urls in REAL_ICONS.items():
        filepath = os.path.join('icons', f'{name}.png')
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            continue
            
        for u in urls:
            try:
                req = urllib.request.Request(u, headers=headers)
                with urllib.request.urlopen(req, context=ctx) as resp:
                    with open(filepath, 'wb') as f:
                        f.write(resp.read())
                print(f"Icono descargado: {name}.png")
                break
            except Exception:
                continue

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

        if self.path == '/api/list':
            try:
                url = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/es_es/v1/champion-summary.json'
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, context=ctx) as resp:
                    raw_list = json.loads(resp.read())
                    champs = {}
                    for c in raw_list:
                        if 0 < c['id'] < 1000:
                            champs[c['alias']] = {
                                'id': c['alias'],
                                'numId': c['id'],
                                'name': c['name'],
                                'icon': f"https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{c['id']}.png"
                            }
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'data': champs}).encode())
            except Exception as e:
                print("Error lista:", e)
                self.send_response(500)
                self.end_headers()

        elif self.path.startswith('/api/'):
            parts = self.path.replace('/api/', '').split('_')
            champ_alias = parts[0]
            num_id = parts[1] if len(parts) > 1 else ''

            url_meraki = f'https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/{champ_alias}.json'
            try:
                req = urllib.request.Request(url_meraki, headers=headers)
                with urllib.request.urlopen(req, context=ctx) as resp:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(resp.read())
                    return
            except Exception:
                pass

            if num_id:
                try:
                    url_cd = f'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/es_es/v1/champions/{num_id}.json'
                    req = urllib.request.Request(url_cd, headers=headers)
                    with urllib.request.urlopen(req, context=ctx) as resp:
                        cd_data = json.loads(resp.read())
                        adapted = {
                            'name': cd_data['name'],
                            'title': cd_data['title'],
                            'abilities': {}
                        }
                        p = cd_data.get('passive', {})
                        p_icon = p.get('abilityIconPath', '').lower().replace('/lol-game-data/assets/', 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/')
                        adapted['abilities']['P'] = [{
                            'name': p.get('name', 'Pasiva'),
                            'icon': p_icon,
                            'effects': [{'description': p.get('description', ''), 'leveling': []}]
                        }]
                        for sp in cd_data.get('spells', []):
                            k = sp['spellKey'].upper()
                            s_icon = sp.get('abilityIconPath', '').lower().replace('/lol-game-data/assets/', 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/')
                            cds = [str(x) for x in sp.get('cooldownCoefficients', [])[:5] if x > 0]
                            costs = [str(x) for x in sp.get('costCoefficients', [])[:5] if x > 0]
                            adapted['abilities'][k] = [{
                                'name': sp.get('name', ''),
                                'icon': s_icon,
                                'cooldown': {'modifiers': [{'values': cds}]} if cds else None,
                                'cost': {'modifiers': [{'values': costs}]} if costs else None,
                                'effects': [{'description': sp.get('dynamicDescription') or sp.get('description', ''), 'leveling': []}]
                            }]
                        
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps(adapted).encode())
                        return
                except Exception as e:
                    print("Error respaldo CD:", e)

            self.send_response(404)
            self.end_headers()
        else:
            super().do_GET()

download_real_icons()
print("Servidor listo en: http://localhost:8000 (Pulsa Ctrl+C para salir)")
try:
    http.server.HTTPServer(('localhost', 8000), Handler).serve_forever()
except KeyboardInterrupt:
    print("\nServidor detenido correctamente.")