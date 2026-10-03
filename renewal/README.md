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
| `download/` | 資料請求（フォーム送信後にサービス紹介資料のPDFをダウンロード） |
| `contact/` | お問い合わせ（用件別の窓口＋共通フォーム） |
| `privacy/` | プライバシーポリシー（現行 `privacy/` から転記） |

## 共通ファイル
- `css/style.css` … 全ページ共通（ヘッダー・フッター・トップ）
- `css/lp.css` … サービスLP用（ヒーロー、お悩み、理由、料金、FAQなど）
- `css/sub.css` … 下層ページ用（ページ見出し、一覧、記事、フォーム、会社概要など）
- `js/main.js` … ヘッダー、メニュー、スライドショー、スクロール表示
- `js/form.js` … フォーム送信。送信先は現行と同じ GAS（`gas/form-handler.gs`）。
  GAS に列がない項目（`data-extra`）は「項目名：値」としてお問い合わせ内容の先頭にまとめて送る

## 送信完了後の面談予約

どのフォームも、送信が完了するとその下に Googleカレンダーの予約ページ（オンライン面談の日程予約）を表示する。
予約ページの URL は `js/form.js` の `BOOKING_URL`。空にすると表示しない。

## 資料請求のPDF

資料請求フォームを送信すると、`assets/docs/hashigo-logi-service-guide.pdf` のダウンロードボタンが出る。
いまは仮のPDFが入っているので、正式な資料ができたら**同じファイル名で上書き**する（ページの修正は不要）。
送信内容はほかのフォームと同じく Google Apps Script に届く（種別「資料請求」）。

## ニュース・ブログの追加・編集・削除
記事は `content/news/` と `content/blog/` に Markdown で置き、スクリプトでページを書き出す。
管理画面は使わない。

1. 記事を追加：`content/blog/<スラッグ>.md` を作る（スラッグがURLになる。例：`blog/3pl-checkpoints/`）
2. 編集：その Markdown を直す　／　削除：その Markdown を消す
3. リポジトリ直下で `python3 renewal/tools/build_posts.py` を実行する
4. 書き出されたページを確認してコミット・プッシュする

スクリプトが作り直すもの：ニュース・ブログの一覧、各記事のページ、トップページの最新5件
（トップページの `<!-- posts:news -->` 〜 `<!-- /posts:news -->` の間）。
Markdown を消した記事のページは自動で削除される。書き出されたHTMLは直接編集しないこと。

Markdown の先頭の設定：
```
---
title: 記事タイトル
date: 2026-09-28
category: 物流            # ニュース：お知らせ／サービス／プレスリリース／メディア掲載／イベント／会社情報
                          # ブログ：物流／越境EC／商品開発／現場DX（ブログは末尾に関連サービスの案内が付く）
image: 3pl/reason-lot.webp # 任意。assets/img/ からのパス（ブログ一覧のサムネイルと記事上部の画像）
description: 説明文        # 任意。省略すると本文の最初の段落
placeholder: true         # 任意。仮の記事として「（仮）」と注意書きを付ける
draft: true               # 任意。下書き。サイトには出さない
---
```
ブログ記事のページは、冒頭に書いた人、右に目次（`## 見出し` から自動で作る。スマホでは本文の前に折りたたみ）、末尾に関連サービスへの導線・書いた人の紹介・関連記事（同じカテゴリを優先して3件）が自動で入る。

一覧ページのカテゴリボタンで絞り込める（記事がある分類だけボタンになる）。`blog/#cat=物流` のように URL でも指定できる。

本文で使える書き方：`## 見出し`、`### 小見出し`、段落、`- 箇条書き`、`1. 番号付き`、`**太字**`、
`[リンク](/services/3pl/)`（`/` で始めるとサイト内のパス）、`![画像の説明](3pl/reason-lot.webp)`、`> 補足のボックス`。

`tools/sitelib.py` はヘッダー・フッターなど下層ページの共通部品。ヘッダーやフッターを変えたら、ここも合わせて直す。

## 作成状況
- 全ページの初版を作成済み。ここから1ページずつ修正する
- ニュース・ブログの記事、サービスの説明文の一部は仮の内容
