# 下層ページを書き出すための共通部品（ヘッダー・フッター・ページ見出しなど）
# ニュース・ブログの書き出し（build_posts.py）から使う。
# ヘッダーやフッターを変えるときは、ここと既存ページの両方をそろえること。
import os, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')) + '/'

GROUPS = [
    ('logistics', '物流支援事業', 'Logistics'),
    ('ec', 'EC支援事業', 'E-Commerce'),
    ('dx', '現場DX事業', 'Field DX'),
]

# サービス一覧。contact_label はヘッダーの塗りボタン、contact_title は相談ページの見出し
SERVICES = [
    dict(slug='3pl', name='3PL（物流代行）', group='logistics', card='service-logistics.webp',
         desc='保管・入出荷・流通加工・配送手配まで、物流業務を庫内オペレーションごと受託します。出荷作業料は1個550円〜（配送料込み）。',
         contact_label='見積依頼', contact_title='3PLのご相談／見積依頼'),
    dict(slug='consulting', name='物流コンサルティング', group='logistics', card='svc/consulting.webp',
         desc='業務の可視化と課題整理から、要件定義、システムの選定・導入、KPI設計まで。現場に定着する改善を支援します。',
         contact_label='相談する', contact_title='物流コンサルティングのご相談／見積依頼'),
    dict(slug='global-ec', name='海外EC運用代行', group='ec', card='svc/global-ec-market.webp',
         desc='Coupang・Amazon・Shopee・Lazadaへの出品から、現地語の商品ページ、広告、問い合わせ対応、越境物流までまとめて代行します。',
         contact_label='相談する', contact_title='海外EC運用代行のご相談／見積依頼'),
    dict(slug='product-development', name='商品開発支援', group='ec', card='service-ec.webp',
         desc='市場の声と販売データをもとに、企画・仕様づくりから製造先探し、販売開始までの商品づくりを支援します。',
         contact_label='相談する', contact_title='商品開発支援のご相談／見積依頼'),
    dict(slug='sanpai-navi', name='産廃予約NAVI', group='dx', card='service-dx.webp',
         desc='産業廃棄物中間処理業の搬入予約と受入キャパシティ管理をシステム化。電話・FAX中心の受付業務をWebに移します。',
         contact_label='お問い合わせ', contact_title='産廃予約NAVIのお問い合わせ'),
    dict(slug='system-development', name='システム開発受託', group='dx', card='svc/system-card.webp',
         desc='既製品では合わない現場の業務に合わせて、要件定義から開発・運用まで受託します。AI活用やデータ整備にも対応します。',
         contact_label='相談する', contact_title='システム開発受託のご相談／見積依頼'),
]
SVC = {s['slug']: s for s in SERVICES}

e = html.escape


def write(path, text):
    full = ROOT + path
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(text)


def head(R, title, desc, css=('style', 'lp', 'sub'), preload=None, extra_head=''):
    links = '\n'.join(f'<link rel="stylesheet" href="{R}css/{c}.css">' for c in css)
    pre = f'\n<link rel="preload" as="image" fetchpriority="high" href="{preload}">' if preload else ''
    return f'''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<!-- リニューアル試験用ページ。本番切り替えまでは検索エンジンに載せない -->
<meta name="robots" content="noindex,nofollow">

<link rel="icon" href="{R}../favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="{R}../favicon.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet">
{links}{pre}{extra_head}
</head>'''


def header(R, current=None, cta=None):
    """current: 'services' などナビの現在地。cta: (href, label) ヘッダー右の塗りボタン"""
    cta = cta or (f'{R}contact/', 'お問い合わせ')
    def nav(key, href, label):
        cur = ' aria-current="true"' if key == current else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<!-- ========== ヘッダー（全ページ共通） ========== -->
<header class="hd" id="hd">
  <div class="hd-in">
    <a href="{R}" class="hd-logo" aria-label="株式会社ハシゴロジ トップページ">
      <img class="logo-w" src="{R}assets/logo-white.webp" alt="Hashigo-Logi" width="1140" height="160">
      <img class="logo-b" src="{R}assets/logo-black.webp" alt="" width="1151" height="160" aria-hidden="true">
    </a>
    <nav class="hd-nav" aria-label="グローバルナビゲーション">
      {nav('services', R + 'services/', 'サービス')}
      {nav('news', R + 'news/', 'ニュース')}
      {nav('blog', R + 'blog/', 'ブログ')}
      {nav('company', R + 'company/', '会社概要')}
    </nav>
    <div class="hd-cta">
      <a href="{R}download/" class="btn btn-ghost">資料請求</a>
      <a href="{cta[0]}" class="btn btn-solid">{cta[1]}<span class="arw" aria-hidden="true"></span></a>
    </div>
    <button class="hd-menu" id="menuBtn" aria-label="メニューを開く" aria-expanded="false" aria-controls="drawer">
      <span></span><span></span>
    </button>
  </div>
</header>

<div class="drawer" id="drawer" hidden>
  <nav aria-label="スマートフォン用メニュー">
    <a href="{R}services/">サービス</a>
    <a href="{R}news/">ニュース</a>
    <a href="{R}blog/">ブログ</a>
    <a href="{R}company/">会社概要</a>
    <a href="{R}download/">資料請求</a>
    <a href="{R}contact/">お問い合わせ</a>
  </nav>
</div>
'''


def footer(R):
    svc_links = '\n'.join(f'          <a href="{R}services/{s["slug"]}/">{s["name"]}</a>' for s in SERVICES)
    return f'''<!-- ========== フッター（全ページ共通） ========== -->
<footer class="ft">
  <div class="wrap">
    <div class="ft-top">
      <a href="{R}" class="ft-logo"><img src="{R}assets/logo-white.webp" alt="Hashigo-Logi" width="1140" height="160" loading="lazy"></a>
      <nav class="ft-nav" aria-label="フッターナビゲーション">
        <div class="ft-col">
          <a href="{R}services/" class="ft-h">サービス</a>
{svc_links}
        </div>
        <div class="ft-col">
          <a href="{R}news/" class="ft-h">ニュース</a>
          <a href="{R}blog/" class="ft-h">ブログ</a>
          <a href="{R}company/" class="ft-h">会社概要</a>
        </div>
        <div class="ft-col">
          <a href="{R}download/" class="ft-h">資料請求</a>
          <a href="{R}contact/" class="ft-h">お問い合わせ</a>
          <a href="{R}privacy/" class="ft-h">プライバシーポリシー</a>
        </div>
      </nav>
    </div>
    <p class="ft-copy">© 2026 Hashigo-Logi, Inc.</p>
  </div>
</footer>
'''


def page(path, title, desc, main, current=None, cta=None, fixcta=None, form=False, preload=None, body_cls='lp', extra_head=''):
    depth = path.count('/')
    R = '../' * depth
    fix = ''
    if fixcta:
        fix = f'''
<!-- スマホ用の追従CTA -->
<div class="fixcta" id="fixcta">
  <a href="{fixcta[0][0]}" class="btn btn-ghost">{fixcta[0][1]}</a>
  <a href="{fixcta[1][0]}" class="btn btn-solid">{fixcta[1][1]}</a>
</div>
'''
    scripts = f'<script src="{R}js/main.js" defer></script>'
    if form:
        scripts += f'\n<script src="{R}js/form.js" defer></script>'
    text = f'''{head(R, title, desc, preload=preload, extra_head=extra_head)}
<body class="{body_cls}">

{header(R, current, cta)}
<main>
{main}
</main>

{footer(R)}{fix}
{scripts}
</body>
</html>
'''
    import navdd
    text = navdd.apply(text, R)
    write(path, text)


def crumbs(items):
    lis = []
    for label, href in items:
        if href:
            lis.append(f'<li><a href="{href}">{label}</a></li>')
        else:
            lis.append(f'<li aria-current="page">{label}</li>')
    return '<ol class="crumb" aria-label="パンくずリスト">\n      ' + '\n      '.join(lis) + '\n    </ol>'


def ph(R, en, h1, lead='', crumb_items=(), img=None):
    """写真なし（または写真付き）のページ見出し"""
    bg = ''
    cls = 'ph'
    if img:
        cls += ' has-img'
        bg = f'''
  <div class="lp-hero-bg" aria-hidden="true"><img src="{R}assets/img/{img}" alt="" fetchpriority="high"></div>
  <div class="lp-hero-tint" aria-hidden="true"></div>'''
    lead_html = ''  # ページ見出しの補足文は表示しない（lead は受け取るが使わない）
    return f'''<section class="{cls}" data-hero>{bg}
  <div class="fv-grain" aria-hidden="true"></div>
  <div class="wrap">
    {crumbs(crumb_items)}
    <p class="ph-en">{en}</p>
    <h1 class="ph-h1">{h1}</h1>{lead_html}
  </div>
</section>'''


def sec(no, en, h2, inner, id_='', cls='', lead=''):
    idattr = f' id="{id_}"' if id_ else ''
    h2_html = f'\n      <h2 class="h2">{h2}</h2>' if h2 else ''
    lead_html = f'\n    <p class="lead-p">{lead}</p>' if lead else ''
    return f'''
<section class="sec {cls}"{idattr}>
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow"><span class="no">{no}</span>{en}</p>{h2_html}
    </div>{lead_html}
{inner}
  </div>
</section>'''


def faq(items):
    out = []
    for q, a in items:
        out.append(f'      <details><summary><span class="q">Q</span>{q}</summary><div class="a"><span class="q">A</span><p>{a}</p></div></details>')
    return '    <div class="faq">\n' + '\n'.join(out) + '\n    </div>'


def faq_jsonld(url, items):
    import json, re
    strip = lambda s: re.sub(r'<[^>]+>', '', s)
    data = {"@context": "https://schema.org", "@type": "FAQPage", "@id": url + '#faq',
            "mainEntity": [{"@type": "Question", "name": strip(q),
                            "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in items]}
    return '\n<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n</script>'


def lp_cta(R, h, lead, primary, secondary=None):
    """締めのCTA。primary/secondary = (href, en, title, desc)"""
    cards = []
    for c in [primary, secondary or (f'{R}download/', 'Download', '資料請求', 'サービスの紹介資料をお送りします。')]:
        cards.append(f'''      <a href="{c[0]}" class="cta-card">
        <span class="cta-en">{c[1]}</span>
        <span class="cta-ttl">{c[2]}</span>
        <span class="cta-desc">{c[3]}</span>
        <span class="cta-arw" aria-hidden="true"></span>
      </a>''')
    return f'''
<section class="cta lp-cta" aria-label="お問い合わせ・資料請求">
  <div class="cta-grain" aria-hidden="true"></div>
  <div class="wrap">
    <div class="lp-cta-head">
      <p class="cta-en">Contact</p>
      <h2 class="lp-cta-h">{h}</h2>
      <p class="lp-cta-lead">{lead}</p>
    </div>
    <div class="cta-grid">
{chr(10).join(cards)}
    </div>
  </div>
</section>'''


def chips(items, cls='chips'):
    return f'<ul class="{cls}">' + ''.join(f'<li>{i}</li>' for i in items) + '</ul>'


def cards(items, cls='cards', numbered=False):
    """items: dict(title, text, tag?, icon?, dots?)"""
    out = []
    for i, it in enumerate(items, 1):
        top = ''
        if numbered:
            top = f'<p class="num">{numbered} <b>{i:02d}</b></p>'
        elif it.get('tag'):
            top = f'<span class="tag">{it["tag"]}</span>'
        icon = it.get('icon', '')
        dots = ''
        if it.get('dots'):
            dots = '<ul class="dots">' + ''.join(f'<li>{d}</li>' for d in it['dots']) + '</ul>'
        out.append(f'      <li class="card rv">{icon}{top}<h3>{it["title"]}</h3><p>{it["text"]}</p>{dots}</li>')
    return f'    <ul class="{cls}">\n' + '\n'.join(out) + '\n    </ul>'


def steps(items):
    out = [f'      <li class="rv"><span class="st">Step <b>{i:02d}</b></span><h3>{t}</h3><p>{d}</p></li>' for i, (t, d) in enumerate(items, 1)]
    return '    <ol class="steps">\n' + '\n'.join(out) + '\n    </ol>'


def worry(items, turn):
    out = [f'      <li class="rv"><span class="q">{q}</span><span class="a">{a}</span></li>' for q, a in items]
    return '    <ul class="worry-grid">\n' + '\n'.join(out) + f'\n    </ul>\n    <p class="worry-turn rv">{turn}</p>'


def reasons(R, items):
    out = []
    for i, it in enumerate(items, 1):
        out.append(f'''      <li class="reason rv">
        <figure class="reason-img"><img src="{R}assets/img/{it['img']}" alt="{it['alt']}" loading="lazy" decoding="async"></figure>
        <div class="reason-body">
          <p class="reason-no">Reason <b>{i:02d}</b></p>
          <h3>{it['title']}</h3>
          <p>{it['text']}</p>
          {chips(it.get('chips', []))}
        </div>
      </li>''')
    return '    <ol class="reason-list">\n' + '\n'.join(out) + '\n    </ol>'


def lp_hero(R, img, crumb_items, group, h1, lead, btns, facts=None):
    g = dict((k, (j, en)) for k, j, en in GROUPS)[group]
    b = '\n      '.join(f'<a href="{h}" class="btn {c} btn-lg">{l}{a}</a>' for h, l, c, a in btns)
    facts_html = ''
    if facts:
        lis = '\n'.join(f'''      <li>
        <span class="k">{k}</span>
        <p class="v"><b>{v}</b><span class="u">{u}</span></p>
        <span class="d">{d}</span>
      </li>''' for k, v, u, d in facts)
        facts_html = f'''
  <div class="wrap">
    <ul class="facts">
{lis}
    </ul>
  </div>'''
    return f'''<section class="lp-hero" data-hero>
  <div class="lp-hero-bg" aria-hidden="true"><img src="{R}assets/img/{img}" alt="" fetchpriority="high"></div>
  <div class="lp-hero-tint" aria-hidden="true"></div>
  <div class="fv-grain" aria-hidden="true"></div>
  <div class="wrap lp-hero-in">
    {crumbs(crumb_items)}
    <p class="lp-cat"><span class="no">{g[1]}</span>{g[0]}</p>
    <h1 class="lp-h1">{h1}</h1>
    <p class="lp-lead">{lead}</p>
    <div class="lp-btns">
      {b}
    </div>
  </div>{facts_html}
</section>'''


def anchor(items):
    lis = ''.join(f'<li><a href="#{i}">{l}</a></li>' for i, l in items)
    return f'''
<nav class="lp-anchor" aria-label="このページの目次">
  <div class="wrap"><ul>{lis}</ul></div>
</nav>'''


ARW = '<span class="arw" aria-hidden="true"></span>'
