#!/usr/bin/env python3
"""Reference material for learning paths and exercise modifications, found with Exa (Brocade Mirror).

    python3 web/tools/exa_content.py        # writes web/content/refs.json + web/data-refs.js

Searches only reputable sources (NIH / PubMed / PMC, major clinics, the NHS, arthritis charities,
open-access journals, qigong / tai chi health bodies) for:
  * beginner / intermediate / advanced practice: how to learn, train and refine Baduanjin;
  * easier variations and cautions per condition, keyed to the 问一问 answer ids (mod-knees, mod-seated…),
    so the chat and the learning path can show "Sources" next to the pre-written advice.
Results are reviewed by a person before shipping: drop anything off-topic in SKIP_URLS and rerun.
The page reads the static file (works offline); the local helper's /api/refs can search live.
Key: $EXA_API_KEY or ~/.config/brocade-mirror/exa.key (never inside baduanjin_app/).
"""
import json, os, re, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)

DOMAINS = ['nccih.nih.gov', 'nih.gov', 'ncbi.nlm.nih.gov', 'pmc.ncbi.nlm.nih.gov', 'pubmed.ncbi.nlm.nih.gov', 'medlineplus.gov',
           'health.harvard.edu', 'mayoclinic.org', 'clevelandclinic.org', 'hopkinsmedicine.org', 'nhs.uk', 'cdc.gov', 'who.int',
           'arthritis.org', 'versusarthritis.org', 'bmj.com', 'bmjopen.bmj.com', 'frontiersin.org', 'mdpi.com', 'plos.org',
           'journals.plos.org', 'biomedcentral.com', 'nature.com', 'thelancet.com', 'jamanetwork.com', 'acog.org',
           'nqa.org', 'taichiforhealthinstitute.org', 'verywellhealth.com']
SITE = {'pmc.ncbi.nlm.nih.gov': 'PubMed Central (NIH)', 'ncbi.nlm.nih.gov': 'NCBI (NIH)', 'pubmed.ncbi.nlm.nih.gov': 'PubMed (NIH)',
        'nccih.nih.gov': 'NCCIH (NIH)', 'medlineplus.gov': 'MedlinePlus (NIH)', 'health.harvard.edu': 'Harvard Health', 'mayoclinic.org': 'Mayo Clinic',
        'clevelandclinic.org': 'Cleveland Clinic', 'hopkinsmedicine.org': 'Johns Hopkins Medicine', 'nhs.uk': 'NHS', 'cdc.gov': 'CDC', 'who.int': 'WHO',
        'arthritis.org': 'Arthritis Foundation', 'versusarthritis.org': 'Versus Arthritis', 'bmj.com': 'The BMJ', 'bmjopen.bmj.com': 'BMJ Open',
        'frontiersin.org': 'Frontiers', 'mdpi.com': 'MDPI', 'journals.plos.org': 'PLOS', 'biomedcentral.com': 'BMC', 'nature.com': 'Nature',
        'jamanetwork.com': 'JAMA Network', 'acog.org': 'ACOG', 'nqa.org': 'National Qigong Association', 'taichiforhealthinstitute.org': 'Tai Chi for Health Institute',
        'verywellhealth.com': 'Verywell Health (medically reviewed)'}

# group -> list of (query, what the highlight should explain)
LEVELS = {
    'beginner': [('Baduanjin for beginners: learning the eight movements safely and easily', 'how beginners learn and practise Baduanjin'),
                 ('safety of Baduanjin exercise systematic review adverse events', 'is Baduanjin safe for beginners')],
    'intermediate': [('Baduanjin training protocol frequency duration weeks of practice', 'how often and how long to practise Baduanjin'),
                     ('Baduanjin breathing coordinated with movement practice', 'coordinating breath and movement in Baduanjin')],
    'advanced': [('long-term Baduanjin practitioners compared with beginners', 'what changes with long-term Baduanjin practice'),
                 ('Health Qigong Baduanjin standardized movements mind-body integration', 'refining Baduanjin technique and mind-body focus')],
}
TOPICS = {  # 问一问 answer id -> searches
    'mod-seated': [('seated Baduanjin chair-based qigong exercise', 'doing Baduanjin seated')],
    'mod-knees': [('Baduanjin or tai chi for knee osteoarthritis exercise', 'knee osteoarthritis and Baduanjin or tai chi')],
    'mod-back': [('Baduanjin exercise for chronic low back pain', 'low back pain and Baduanjin')],
    'mod-neck': [('Baduanjin for neck pain cervical spondylosis', 'neck pain and Baduanjin')],
    'mod-balance': [('Baduanjin balance and fall prevention in older adults', 'balance and falls in older adults')],
    'mod-bp-heart': [('Baduanjin blood pressure hypertension', 'blood pressure and Baduanjin'),
                     ('Baduanjin heart failure cardiac rehabilitation', 'Baduanjin for heart patients')],
    'mod-osteoporosis': [('Baduanjin osteoporosis bone mineral density', 'osteoporosis and Baduanjin')],
    'mod-pregnancy': [('exercise during pregnancy guidance yoga tai chi', 'safe exercise during pregnancy')],
    'mod-shoulder': [('qigong or tai chi for shoulder pain mobility', 'shoulder pain and qigong')],
    'b-evidence': [('Baduanjin systematic review meta-analysis health outcomes', 'what research shows about Baduanjin')],
    'b-stress-sleep': [('Baduanjin sleep quality anxiety depression', 'sleep and mood with Baduanjin')],
}
SKIP_URLS = re.compile(r'supplementary|/DC\d/|\.pdf(\?|$)'
                       # reviewed 2026-11-11 and dropped as off-topic for their group:
                       r'|PMC6320153|pubmed\.ncbi\.nlm\.nih\.gov/25411207', re.I)
PER_GROUP = 3


def key():
    k = os.environ.get('EXA_API_KEY', '').strip()
    p = os.path.expanduser('~/.config/brocade-mirror/exa.key')
    if not k and os.path.exists(p):
        k = open(p).read().strip()
    if not k:
        sys.exit('No Exa key: set EXA_API_KEY or write it to ' + p)
    return k


def search(query, focus, k, n=6):
    body = {'query': query, 'numResults': n, 'type': 'auto', 'includeDomains': DOMAINS,
            'contents': {'highlights': {'numSentences': 2, 'highlightsPerUrl': 1, 'query': focus}}}
    req = urllib.request.Request('https://api.exa.ai/search', data=json.dumps(body).encode(), method='POST',
                                 headers={'x-api-key': k, 'Content-Type': 'application/json'})
    for attempt in range(5):  # Exa rate-limits bursts: back off on 429
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 4:
                raise
            time.sleep(1.5 * 2 ** attempt)


def site_of(url):
    host = urlparse(url).netloc.lower().replace('www.', '')
    for d in sorted(SITE, key=len, reverse=True):
        if host == d or host.endswith('.' + d):
            return SITE[d]
    return host


def clean(r):
    note = re.sub(r'\s+', ' ', ((r.get('highlights') or [''])[0] or '')).strip()
    year = (r.get('publishedDate') or '')[:4] or None
    title = re.sub(r'\s+', ' ', r.get('title') or '').strip()
    title = re.sub(r'^Frontiers \| ', '', title)
    title = re.sub(r' - PubMed$', '', title)
    return {'title': title, 'url': r['url'], 'site': site_of(r['url']), 'year': year, 'note': note[:280]}


def collect(groups, k):
    jobs = [(g, q, f) for g, qs in groups.items() for q, f in qs]
    with ThreadPoolExecutor(3) as ex:
        res = list(ex.map(lambda j: (j[0], search(j[1], j[2], k)), jobs))
    out, seen, cost = {g: [] for g in groups}, set(), 0.0
    for g, d in res:
        cost += (d.get('costDollars') or {}).get('total', 0)
        for r in d.get('results', []):
            u = r['url'].split('#')[0]
            if u in seen or SKIP_URLS.search(u) or not r.get('title'):
                continue
            if len(out[g]) < PER_GROUP:
                seen.add(u); out[g].append(clean(r))
    return out, cost


def main():
    k = key()
    levels, c1 = collect(LEVELS, k)
    topics, c2 = collect(TOPICS, k)
    data = {'version': 1, 'note': 'Found with Exa among reputable sources; reviewed by a person before shipping. Not medical advice.',
            'levels': levels, 'byEntry': topics}
    with open(os.path.join(WEB, 'content', 'refs.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(os.path.join(WEB, 'data-refs.js'), 'w', encoding='utf-8') as f:
        f.write('/* GENERATED by tools/exa_content.py, do not edit */\nwindow.BDJ_REFS = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    n = sum(len(v) for v in levels.values()) + sum(len(v) for v in topics.values())
    print('refs: %d sources (%d level, %d topic) for $%.3f -> content/refs.json + data-refs.js' % (
        n, sum(len(v) for v in levels.values()), sum(len(v) for v in topics.values()), c1 + c2))


if __name__ == '__main__':
    main()
