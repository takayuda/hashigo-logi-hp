# ヘッダーの「サービス」にドロップダウン、スマホメニューに6サービスを足す（ページ書き出し時に適用）
import re
GROUPS=[('物流支援事業','Logistics',[('3pl','3PL（物流代行）'),('consulting','物流コンサルティング')]),
        ('EC支援事業','E-Commerce',[('global-ec','海外EC運用代行'),('product-development','商品開発支援')]),
        ('現場DX事業','Field DX',[('sanpai-navi','産廃予約NAVI'),('system-development','システム開発受託')])]
def panel(R):
    cols=[]
    for ja,en,items in GROUPS:
        links=''.join(f'<li><a href="{R}services/{s}/">{n}</a></li>' for s,n in items)
        cols.append(f'<div class="nav-dd-col"><p class="nav-dd-h"><span>{en}</span>{ja}</p><ul>{links}</ul></div>')
    return (f'<div class="nav-dd-panel" id="navServices"><div class="nav-dd-in">'+''.join(cols)+
            f'<a href="{R}services/" class="nav-dd-all">サービス一覧を見る<span class="arw" aria-hidden="true"></span></a></div></div>')
def drawer_sub(R):
    links=''.join(f'<a href="{R}services/{s}/">{n}</a>' for _,_,items in GROUPS for s,n in items)
    return f'<div class="drawer-sub">{links}</div>'
def apply(h, R):
    if 'nav-dd-panel' in h: return h
    m=re.search(r'(<nav class="hd-nav"[^>]*>\s*)(<a href="[^"]*"( aria-current="true")?>サービス</a>)',h)
    a=m.group(2).replace('>サービス</a>',' class="nav-dd-top" aria-haspopup="true">サービス</a>')
    h=h[:m.start(2)]+f'<div class="nav-dd">{a}{panel(R)}</div>'+h[m.end(2):]
    m=re.search(r'(<div class="drawer" id="drawer" hidden>\s*<nav[^>]*>\s*)(<a href="[^"]*">サービス</a>)',h)
    return h[:m.end(2)]+'\n    '+drawer_sub(R)+h[m.end(2):]
