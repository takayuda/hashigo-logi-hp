"""404ページ（存在しないURLを開いたときの表示）を書き出す

  使い方（リポジトリ直下で）:  python3 site/tools/make_404.py && python3 site/tools/seo.py
  どの階層のURLでも表示されるため、リンクと画像のパスはすべて「/」から始まる形に直す。
"""
import os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from sitelib import ROOT, page, ph, ARW  # noqa: E402

main = ph('', 'Not Found', 'ページが見つかりません') + f'''
<section class="sec sec-tight">
  <div class="wrap nf">
    <p>お探しのページは、移動または削除された可能性があります。<br>お手数ですが、トップページやサービス一覧からお探しください。</p>
    <div class="nf-btns">
      <a href="./" class="btn btn-solid">トップページへ{ARW}</a>
      <a href="services/" class="btn btn-ghost">サービス一覧</a>
      <a href="contact/" class="btn btn-ghost">お問い合わせ</a>
    </div>
  </div>
</section>'''
page('404.html', 'ページが見つかりません｜株式会社ハシゴロジ', 'お探しのページが見つかりませんでした。', main)

path = os.path.join(ROOT, '404.html')
text = open(path, encoding='utf-8').read()
# 相対パスを絶対パスに（http・#・mailto・/ で始まるものはそのまま）
text = re.sub(r'(href|src)="(?!https?:|#|mailto:|tel:|/)(\./)?([^"]*)"', r'\1="/\3"', text)
open(path, 'w', encoding='utf-8').write(text)
print('404.html を書き出しました')
