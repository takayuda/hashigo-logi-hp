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

## 構成（ページ）
| パス | ページ |
|---|---|
| `index.html` | トップ |
| `services/` | サービス一覧 |
| `services/{3pl,consulting,global-ec,product-development,sanpai-navi,system-development}/` | 各サービス |
| `services/*/contact/` | 各サービスの相談・見積依頼（産廃予約NAVIはお問い合わせ） |
| `news/`・`news/*/` | ニュース一覧・記事（5件、うち4件は仮） |
| `blog/`・`blog/*/` | ブログ一覧・記事（5件、すべて仮） |
| `company/` | 会社概要 |
| `download/` | 資料請求 |
| `contact/` | お問い合わせ（用件別の窓口＋共通フォーム） |
| `privacy/` | プライバシーポリシー（現行 `privacy/` から転記） |

## 共通ファイル
- `css/style.css` … 全ページ共通（ヘッダー・フッター・トップ）
- `css/lp.css` … サービスLP用（ヒーロー、お悩み、理由、料金、FAQなど）
- `css/sub.css` … 下層ページ用（ページ見出し、一覧、記事、フォーム、会社概要など）
- `js/main.js` … ヘッダー、メニュー、スライドショー、スクロール表示
- `js/form.js` … フォーム送信。送信先は現行と同じ GAS（`gas/form-handler.gs`）。
  GAS に列がない項目（`data-extra`）は「項目名：値」としてお問い合わせ内容の先頭にまとめて送る

## 作成状況
- 全ページの初版を作成済み。ここから1ページずつ修正する
- ニュース・ブログの記事、サービスの説明文の一部は仮の内容
