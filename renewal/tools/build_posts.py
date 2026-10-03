#!/usr/bin/env python3
"""
ニュース・ブログを Markdown から書き出す。

  使い方（リポジトリ直下で）:  python3 renewal/tools/build_posts.py

  記事の置き場所:
    renewal/content/news/<スラッグ>.md   … ニュース
    renewal/content/blog/<スラッグ>.md   … ブログ
  スラッグ（ファイル名）がそのままURLになる（例: blog/3pl-checkpoints/）。

  ファイルの先頭に「---」で囲んだ設定を書く:
    ---
    title: 小ロットEC事業者が3PLを選ぶときの5つの視点
    date: 2026-09-28
    category: 物流
    image: 3pl/reason-custom.webp     # 任意。renewal/assets/img/ からのパス
    description: 一覧や検索結果に出す説明文  # 任意。省略すると本文の最初の段落
    placeholder: true                 # 任意。仮の記事として「（仮）」を付ける
    draft: true                       # 任意。下書き。サイトには書き出さない
    ---
  本文は Markdown（見出し ## / ###、段落、- 箇条書き、1. 番号付き、**太字**、
  [リンク](/services/3pl/)、![画像の説明](3pl/reason-custom.webp)、> 引用）。
  「/」で始まるリンクはリニューアル版サイトの直下からのパスとして扱う。

  実行すると次を作り直す:
    - news/index.html, blog/index.html（一覧）
    - news/<スラッグ>/index.html, blog/<スラッグ>/index.html（記事）
    - トップページ（index.html）のニュース・ブログ最新5件
  Markdown を消した記事は、ページも削除する。
"""
import os, re, sys, shutil, html

sys.path.insert(0, os.path.dirname(__file__))
from sitelib import ROOT, SVC, page, crumbs, ph, ARW  # noqa: E402

CONTENT = ROOT + 'content/'
MARK = '<!-- generated:post（tools/build_posts.py が書き出したページ。直接編集しない） -->'
TOP_COUNT = 5
SECTIONS = {
    'news': dict(label='ニュース', en='News', img='svc/news.webp',
                 desc='株式会社ハシゴロジのニュース。会社からのお知らせ、サービスの開始、メディア掲載などをお伝えします。',
                 cats=['お知らせ', 'サービス', 'プレスリリース', 'メディア掲載', 'イベント', '会社情報']),
    'blog': dict(label='ブログ', en='Blog', img='svc/blog.webp',
                 desc='株式会社ハシゴロジのブログ。物流、越境EC、商品開発、現場DXについて、実務で得た知見を発信しています。',
                 cats=['物流', '越境EC', '商品開発', '現場DX']),
}
# ブログ記事の末尾に出す、カテゴリごとの関連サービス
RELATED = {'物流': '3pl', '越境EC': 'global-ec', '商品開発': 'product-development', '現場DX': 'sanpai-navi'}


# ---------------------------------------------------------------- 読み込み
def parse(path):
    text = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n(.*)', text, re.S)
    if not m:
        sys.exit(f'{path}: 先頭に --- で囲んだ設定がありません')
    meta = {}
    for line in m.group(1).splitlines():
        line = re.sub(r'\s+#.*$', '', line)
        if ':' in line:
            k, v = line.split(':', 1)
            meta[k.strip()] = v.strip().strip('"\'')
    for k in ('title', 'date', 'category'):
        if not meta.get(k):
            sys.exit(f'{path}: {k} がありません')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', meta['date']):
        sys.exit(f'{path}: date は 2026-09-28 の形で書いてください')
    for k in ('placeholder', 'draft'):
        meta[k] = meta.get(k, '').lower() in ('true', 'yes', '1')
    meta['slug'] = os.path.splitext(os.path.basename(path))[0]
    meta['body_md'] = m.group(2).strip()
    return meta


def load(section):
    d = CONTENT + section
    posts = [parse(os.path.join(d, f)) for f in sorted(os.listdir(d)) if f.endswith('.md')] if os.path.isdir(d) else []
    posts = [p for p in posts if not p['draft']]
    return sorted(posts, key=lambda p: (p['date'], p['slug']), reverse=True)


# ---------------------------------------------------------------- Markdown（よく使う書き方だけに対応）
def inline(s, R):
    s = html.escape(s, quote=False)
    s = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', lambda m: f'<img src="{img_url(m.group(2), R)}" alt="{m.group(1)}" loading="lazy">', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{link_url(m.group(2), R)}"{ext(m.group(2))}>{m.group(1)}</a>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    return s


def link_url(u, R):
    return R + u.lstrip('/') if u.startswith('/') else u


def img_url(u, R):
    return u if re.match(r'https?:', u) else f'{R}assets/img/{u.lstrip("/")}'


def ext(u):
    return ' target="_blank" rel="noopener"' if re.match(r'https?:', u) else ''


def markdown(md, R):
    out, para, lst = [], [], None

    def flush():
        nonlocal para, lst
        if para:
            out.append('<p>' + '<br>'.join(inline(x, R) for x in para) + '</p>')
            para = []
        if lst:
            tag, items = lst
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(i, R)}</li>' for i in items) + f'</{tag}>')
            lst = None

    for line in md.splitlines():
        s = line.rstrip()
        if not s.strip():
            flush(); continue
        if s.lstrip().startswith('<'):          # HTMLはそのまま通す
            flush(); out.append(s); continue
        m = re.match(r'(#{2,4})\s+(.*)', s)
        if m:
            flush(); n = len(m.group(1)); out.append(f'<h{n}>{inline(m.group(2), R)}</h{n}>'); continue
        m = re.match(r'\s*[-*]\s+(.*)', s) or re.match(r'\s*\d+\.\s+(.*)', s)
        if m:
            tag = 'ol' if re.match(r'\s*\d+\.', s) else 'ul'
            if para: flush()
            if lst and lst[0] != tag: flush()
            lst = lst or (tag, [])
            lst[1].append(m.group(1)); continue
        m = re.match(r'>\s?(.*)', s)
        if m:
            flush(); out.append(f'<div class="box">{inline(m.group(1), R)}</div>'); continue
        if lst: flush()
        para.append(s.strip())
    flush()
    return '\n'.join(out)


# ---------------------------------------------------------------- 書き出し
def fmt(d):
    return d.replace('-', '.')


def title_of(p):
    return ('（仮）' if p['placeholder'] else '') + p['title']


def describe(p):
    if p.get('description'):
        return p['description']
    first = re.sub(r'<[^>]+>', '', markdown(p['body_md'].split('\n\n')[0], '')).strip()
    return first[:110]


def li(p, href):
    return (f'          <li><a href="{href}"><time datetime="{p["date"]}">{fmt(p["date"])}</time>'
            f'<span class="tag">{html.escape(p["category"])}</span><span class="ttl">{html.escape(title_of(p))}</span></a></li>')


def filters(section, posts):
    used = [c for c in SECTIONS[section]['cats'] if any(p['category'] == c for p in posts)]
    used += sorted({p['category'] for p in posts} - set(used))
    tags = ['すべて'] + used
    return ''.join(('<span class="is-on">' if i == 0 else '<span>') + html.escape(t) + '</span>' for i, t in enumerate(tags))


def build_list(section, posts):
    cfg = SECTIONS[section]
    R = '../'
    head = ph(R, cfg['en'], cfg['label'], '', [('ホーム', R), (cfg['label'], None)], img=cfg['img'])
    if not posts:
        body = '    <p>まだ記事はありません。</p>'
    elif section == 'news':
        body = '    <ul class="post-list">\n' + '\n'.join(li(p, p['slug'] + '/') for p in posts) + '\n    </ul>'
    else:
        body = '    <div class="blog-cards">\n' + '\n'.join(f'''      <a href="{p['slug']}/" class="blog-card rv">
        <div class="thumb">{f'<img src="{R}assets/img/{p["image"]}" alt="" loading="lazy" decoding="async">' if p.get('image') else ''}</div>
        <div class="body">
          <div class="meta"><time datetime="{p['date']}">{fmt(p['date'])}</time><span class="tag">{html.escape(p['category'])}</span></div>
          <h3>{html.escape(title_of(p))}</h3>
        </div>
      </a>''' for p in posts) + '\n    </div>'
    wrap_cls = 'wrap list-big' if section == 'news' else 'wrap'
    sec_cls = 'sec sec-tight' if section == 'news' else 'sec sec-tight bg-2'
    main = head + f'''
<section class="{sec_cls}">
  <div class="{wrap_cls}">
    <!-- カテゴリの絞り込みは記事が増えたら有効にする（現在は表示のみ） -->
    <div class="list-filter">{filters(section, posts)}</div>
{body}
  </div>
</section>'''
    page(f'{section}/index.html', f'{cfg["label"]}｜株式会社ハシゴロジ', cfg['desc'], main, current=section,
         preload=R + 'assets/img/' + cfg['img'])


def build_article(section, p, posts):
    cfg = SECTIONS[section]
    R = '../../'
    head = f'''{MARK}
<section class="ph" data-hero>
  <div class="fv-grain" aria-hidden="true"></div>
  <div class="wrap">
    {crumbs([('ホーム', R), (cfg['label'], '../'), (html.escape(p['title']), None)])}
    <div class="article-meta"><time datetime="{p['date']}">{fmt(p['date'])}</time><span class="tag">{html.escape(p['category'])}</span></div>
    <h1 class="ph-h1">{html.escape(title_of(p))}</h1>
  </div>
</section>'''
    eye = f'\n    <figure class="article-eye"><img src="{R}assets/img/{p["image"]}" alt="" decoding="async"></figure>' if p.get('image') else ''
    note = '<p class="draft-note">この記事は仮の内容です。公開前に差し替えてください。</p>\n' if p['placeholder'] else ''
    rel = ''
    if section == 'blog' and RELATED.get(p['category']):
        s = SVC[RELATED[p['category']]]
        rel = f'''
    <div class="related-cta">
      <p>{s['name']}について、詳しくはこちら</p>
      <a href="{R}services/{s['slug']}/" class="btn btn-solid">サービスを見る{ARW}</a>
    </div>'''
    i = posts.index(p)
    nav = f'<a href="../{posts[i + 1]["slug"]}/" class="more">前の記事{ARW}</a>' if i + 1 < len(posts) else ''
    main = head + f'''
<section class="sec sec-tight">
  <div class="wrap">{eye}
    <article class="article prose">
{note}{markdown(p['body_md'], R)}
    </article>{rel}
    <div class="article-foot">
      <a href="../" class="more">{cfg['label']}一覧へ戻る{ARW}</a>
      {nav}
    </div>
  </div>
</section>'''
    page(f'{section}/{p["slug"]}/index.html', f'{title_of(p)}｜{cfg["label"]}｜株式会社ハシゴロジ', describe(p), main, current=section)


def remove_stale(section, posts):
    """Markdown が消えた記事のページを削除する（このスクリプトが書き出したページだけ）"""
    keep = {p['slug'] for p in posts}
    d = ROOT + section
    for name in os.listdir(d):
        f = os.path.join(d, name, 'index.html')
        if name not in keep and os.path.isfile(f) and MARK in open(f, encoding='utf-8').read():
            shutil.rmtree(os.path.join(d, name))
            print(f'削除: {section}/{name}/')


def update_top(section, posts):
    """トップページの最新記事（<!-- posts:news --> 〜 <!-- /posts:news --> の間）を書き換える"""
    f = ROOT + 'index.html'
    h = open(f, encoding='utf-8').read()
    start, end = f'<!-- posts:{section} -->', f'<!-- /posts:{section} -->'
    if start not in h:
        sys.exit(f'index.html に {start} がありません')
    items = '\n'.join(li(p, f'{section}/{p["slug"]}/') for p in posts[:TOP_COUNT])
    h = re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda m: f'{start}\n{items}\n          {end}', h, flags=re.S)
    open(f, 'w', encoding='utf-8').write(h)


def main():
    for section in SECTIONS:
        posts = load(section)
        build_list(section, posts)
        for p in posts:
            build_article(section, p, posts)
        remove_stale(section, posts)
        update_top(section, posts)
        print(f'{SECTIONS[section]["label"]}: {len(posts)}件')


if __name__ == '__main__':
    main()
