#!/usr/bin/env python3
"""Parse the Ontario Ministry public-school list into a clean JSON artifact:
boards (all) + regular day high schools (grade 9-12, excluding special programs)."""
import zipfile, re, json, sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

XLSX = 'data/ontario_all_schools_may2026.xlsx'
OUT = 'data/ontario_institutions_build.json'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
EXCLUDE = {'Summer', 'Continuing Education', 'Care/Treatment Facility',
           'Cust/Correctional Facility', 'Adult', 'Temporary Remote Learning School'}

z = zipfile.ZipFile(XLSX)
ss = []
for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
    ss.append(''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')))
relmap = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
wb = ET.fromstring(z.read('xl/workbook.xml'))
rid = wb.find('m:sheets', NS)[0].get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')

def col_idx(ref):
    s = re.match(r'[A-Z]+', ref).group(); n = 0
    for ch in s: n = n * 26 + (ord(ch) - 64)
    return n - 1

sh = ET.fromstring(z.read('xl/' + relmap[rid]))
rows = []
for row in sh.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
    cells = {}
    for c in row.findall('m:c', NS):
        v = c.find('m:v', NS); t = c.get('t'); val = v.text if v is not None else ''
        if t == 's' and val not in ('', None): val = ss[int(val)]
        cells[col_idx(c.get('r'))] = val
    rows.append([cells.get(i, '') for i in range(24)])
hdr = rows[0]; data = rows[1:]; idx = {h: i for i, h in enumerate(hdr)}

def g(r, n):
    return (r[idx[n]] or '').strip()

def title_city(c):
    # normalize "Sault Ste Marie" style; keep as-is but title-case oddities minimal
    return c.strip()

def domain_of(email):
    email = (email or '').strip().lower()
    return email.split('@')[1] if '@' in email else None

def clean_site(u):
    u = (u or '').strip()
    if not u: return None
    if not u.startswith('http'): u = 'https://' + u
    return u

def expand_name(name):
    # Normalize the Ministry's abbreviated board names to full display form so the
    # 81 new boards match the existing 4 (e.g. "Toronto DSB" -> "Toronto District School Board").
    n = name
    if n.startswith('CS catholique '):
        n = 'Conseil scolaire catholique ' + n[len('CS catholique '):]
    elif n.startswith('CS public '):
        n = 'Conseil scolaire public ' + n[len('CS public '):]
    elif n.startswith('CSD catholique '):
        n = 'Conseil scolaire de district catholique ' + n[len('CSD catholique '):]
    elif n.startswith('CS '):
        n = 'Conseil scolaire ' + n[len('CS '):]
    if n.startswith('CDSB of '):
        n = 'Catholic District School Board of ' + n[len('CDSB of '):]
    if n.startswith('DSB of '):
        n = 'District School Board of ' + n[len('DSB of '):]
    # trailing tokens
    n = re.sub(r'\bCDSB\b', 'Catholic District School Board', n)
    n = re.sub(r'\bDSB\b', 'District School Board', n)
    n = re.sub(r'\bSA\b', 'School Authority', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def board_abbr(name):
    # "Algoma DSB" -> ADSB ; "Toronto Catholic DSB" -> TCDSB ; keep uppercase tokens whole
    toks = re.split(r'[\s\-]+', name)
    out = []
    for t in toks:
        if not t: continue
        if t.isupper() and len(t) <= 5:  # DSB, CDSB, CSD ...
            out.append(t)
        else:
            out.append(t[0].upper())
    ab = ''.join(out)
    return ab[:12] if ab else None

# ---- boards (from every row, any level) ----
boards = {}
board_cities = defaultdict(Counter)
for r in data:
    bnum = g(r, 'Board Number'); bname = g(r, 'Board Name')
    if not bnum or not bname: continue
    if bnum not in boards:
        boards[bnum] = {
            'external_id': bnum,
            'name': expand_name(bname),
            'abbreviation': board_abbr(bname),
            'type': 'school_board',
            'board_type': g(r, 'Board Type'),
            'region': g(r, 'Region'),
            'website': clean_site(g(r, 'Board Website')),
        }
    c = g(r, 'City')
    if c: board_cities[bnum][c] += 1
for bnum, b in boards.items():
    if board_cities[bnum]:
        b['city'] = board_cities[bnum].most_common(1)[0][0]
    else:
        b['city'] = None

# ---- high schools: regular day, grade 9-12 ----
hs = []
for r in data:
    if g(r, 'School Level') != 'Secondary':
        continue
    if g(r, 'School Special Conditions') in EXCLUDE:
        continue
    hs.append({
        'external_id': g(r, 'School Number'),
        'name': g(r, 'School Name'),
        'type': 'high_school',
        'school_type': g(r, 'School Type'),       # Public / Catholic / Provincial / Consortium
        'language': g(r, 'School Language'),
        'city': title_city(g(r, 'City')),
        'website': clean_site(g(r, 'Website')),
        'email_domain': domain_of(g(r, 'Email')),
        'grade_range': g(r, 'Grade Range'),
        'board_external_id': g(r, 'Board Number'),
    })

out = {
    'source': 'data.ontario.ca Publicly Funded Schools, May 2026 (English)',
    'boards': list(boards.values()),
    'high_schools': hs,
}
json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
print(f"boards: {len(out['boards'])}")
print(f"high_schools: {len(hs)}  (public={sum(1 for h in hs if h['school_type']=='Public')}, "
      f"catholic={sum(1 for h in hs if h['school_type']=='Catholic')}, "
      f"other={sum(1 for h in hs if h['school_type'] not in ('Public','Catholic'))})")
print(f"high_schools with website: {sum(1 for h in hs if h['website'])} ; with email domain: {sum(1 for h in hs if h['email_domain'])}")
print(f"wrote {OUT}")
# sanity: any duplicate school numbers?
nums = [h['external_id'] for h in hs]
dups = [k for k, v in Counter(nums).items() if v > 1]
print("duplicate school numbers:", dups[:10], '...' if len(dups) > 10 else '')
