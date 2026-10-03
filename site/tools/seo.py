"""検索エンジン・SNS向けのタグとサイトマップを書き出す

  使い方（リポジトリ直下で）:  python3 site/tools/seo.py
  ※ build_posts.py の最後でも自動で実行される。ページを直接編集・追加したときは単体で実行する。

  site/ 以下の全ページについて、<meta name="description"> の直後に次のタグを入れ直す
  （<!-- seo:begin --> 〜 <!-- seo:end --> の間を毎回置き換える。手で編集しない）。
    - robots / canonical（正規URL）
    - OGP（SNSで共有したときのタイトル・説明・画像）と X（Twitter）のカード
    - トップページのみ、会社とサイトの構造化データ（Organization / WebSite）
  あわせて site/sitemap.xml を全ページから作り直す。
"""
import os, re, sys, json, html, subprocess, datetime

sys.path.insert(0, os.path.dirname(__file__))
from sitelib import ROOT  # noqa: E402

SITE = 'https://hashigologi.com/'
OG_IMAGE = SITE + 'assets/ogp.jpg'   # 1200×630。差し替えるときは同じファイル名で上書きする
SITE_NAME = '株式会社ハシゴロジ'
SKIP_DIRS = {'content', 'tools'}
NOT_PAGES = {'404.html'}             # 正規URLを持たないページ（サイトマップにも載せない）

ORG = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': SITE + '#organization',
            'name': SITE_NAME,
            'alternateName': 'Hashigo-Logi, Inc.',
            'url': SITE,
            'logo': SITE + 'assets/logo.png',
            'image': OG_IMAGE,
            'email': 'takayuda@hashigo-logi.com',
            'foundingDate': '2026-06-16',
            'description': '物流支援・EC支援・現場DXの3つの事業で、商品・市場・現場・会社をなめらかに繋ぐ会社です。',
            'address': {'@type': 'PostalAddress', 'addressCountry': 'JP', 'addressRegion': '東京都',
                        'addressLocality': '目黒区', 'streetAddress': '八雲2-20-12'},
            'founder': {'@type': 'Person', 'name': '髙橋 優大', 'jobTitle': '代表取締役'},
        },
        {
            '@type': 'WebSite',
            '@id': SITE + '#website',
            'url': SITE,
            'name': SITE_NAME,
            'inLanguage': 'ja',
            'publisher': {'@id': SITE + '#organization'},
        },
    ],
}

BLOCK = re.compile(r'\n?<!-- seo:begin -->.*?<!-- seo:end -->', re.S)


def pages():
    for dirpath, dirnames, files in os.walk(ROOT):
        rel_dir = os.path.relpath(dirpath, ROOT)
        if rel_dir.split(os.sep)[0] in SKIP_DIRS:
            continue
        for f in files:
            if f.endswith('.html'):
                yield os.path.normpath(os.path.join(rel_dir, f)).replace(os.sep, '/')


def url_of(rel):
    if rel == 'index.html':
        return SITE
    return SITE + (rel[:-len('index.html')] if rel.endswith('/index.html') else rel)


def block(rel, text):
    esc = lambda s: html.escape(s, quote=True)
    if rel in NOT_PAGES:
        return '<!-- seo:begin -->\n<meta name="robots" content="noindex">\n<!-- seo:end -->'
    title = html.unescape(re.search(r'<title>(.*?)</title>', text, re.S).group(1).strip())
    m = re.search(r'<meta name="description" content="([^"]*)"', text)
    desc = html.unescape(m.group(1)) if m else ''
    url = url_of(rel)
    kind = 'article' if 'generated:post' in text and rel.count('/') >= 2 else 'website'
    lines = [
        '<!-- seo:begin -->',
        '<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">',
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:type" content="{kind}">',
        f'<meta property="og:site_name" content="{SITE_NAME}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(desc)}">',
        f'<meta property="og:image" content="{OG_IMAGE}">',
        '<meta property="og:locale" content="ja_JP">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    if rel == 'index.html':
        lines.append('<script type="application/ld+json">\n' + json.dumps(ORG, ensure_ascii=False, indent=2) + '\n</script>')
    lines.append('<!-- seo:end -->')
    return '\n'.join(lines)


def lastmod(rel):
    try:
        out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', os.path.join(ROOT, rel)],
                             capture_output=True, text=True, cwd=ROOT).stdout.strip()
    except OSError:
        out = ''
    return out or datetime.date.today().isoformat()


def main():
    urls = []
    for rel in sorted(pages()):
        path = os.path.join(ROOT, rel)
        text = open(path, encoding='utf-8').read()
        new = BLOCK.sub('', text)
        m = re.search(r'<meta name="description"[^>]*>', new) or re.search(r'</title>', new)
        new = new[:m.end()] + '\n' + block(rel, new) + new[m.end():]
        if new != text:
            open(path, 'w', encoding='utf-8').write(new)
        if rel not in NOT_PAGES:
            urls.append((url_of(rel), lastmod(rel)))
    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    xml += [f'  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>' for u, d in urls]
    xml.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(xml) + '\n')
    print(f'SEOタグ: {len(urls)}ページ、sitemap.xml を更新')


if __name__ == '__main__':
    main()
