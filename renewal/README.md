# コーポレートサイト リニューアル（試験版）

本番サイト（リポジトリ直下の `index.html` など）には手を入れず、`renewal/` 配下で1ページずつ作成する。
全ページには `<meta name="robots" content="noindex,nofollow">` を付け、本番切り替えまで検索エンジンに載せない。

## 確認方法
- ローカル: リポジトリ直下で `npx wrangler dev` または `npx http-server .` を実行し、`/renewal/` を開く
- デプロイ後: `https://<ドメイン>/renewal/`

## 構成
- `index.html` … トップページ
- `css/style.css` / `js/main.js` … 全ページ共通
- `assets/` … `hashigo-logi-assets 2/` から変換した配信用画像
  - `fv/` FVスライド（1672px幅 WebP）、`img/` サービス・代表写真（WebP）
  - `logo-white.webp` / `logo-black.webp` … 背景付きロゴPNGから生成した透過版
  - `grain.png` … FVとCTAに重ねる粒子テクスチャ

## 作成状況
- [x] トップページ（ニュース・ブログは仮の記事）
- [ ] サービス一覧・各サービス詳細（6）・各相談／見積フォーム（6）
- [ ] ニュース一覧・記事 / ブログ一覧・記事
- [ ] 会社概要 / 資料請求 / お問い合わせ
