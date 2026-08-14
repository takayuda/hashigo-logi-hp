# フォームの自動テスト

`3pl/index.html` と `index.html` のお問い合わせフォームを、実際のブラウザで
動かして確認します。項目を増減したときは必ず実行してください。

## 実行

```bash
# リポジトリのルートで
python3 -m http.server 8899 &
npx playwright@1.56 install chromium   # 初回のみ
node tests/form.test.js
```

全項目が PASS なら終了コード0、ひとつでも落ちると1を返します。

## 確認していること

| # | 内容 |
|---|---|
| 1 | 項目構成・選択肢の中身・ラベルと入力欄の紐づけ・ハニーポットが隠れているか |
| 2 | 未入力／不正なメールアドレスで送信されないこと、エラー表示 |
| 3 | 全項目を埋めたときの送信内容が1項目ずつ期待どおりか |
| 4 | トップページの共通フォームが従来どおり動くこと（回帰） |
| 5 | ハニーポットに値が入っても送信は行われ、判定用の値が乗ること |
| 6 | 送信失敗時にエラーとメール連絡先が出て、再送信できる状態に戻ること |
| 7 | スマホ幅で送信できること、横スクロールが出ないこと |

送信先は `script.google.com` へのリクエストを差し替えて捕まえているため、
**実際のスプレッドシートには何も書き込まれません。**

## 本番への実送信を確認したいとき

上のテストはブラウザ側までしか見ていません。GASがスプレッドシートへ
書き込むところまで確認したい場合は、`script.js` の `FORM_ENDPOINT` に
直接POSTしてください（テストと分かる値を入れ、あとで行を削除すること）。

```bash
curl -sS -X POST "$(grep -oE 'https://script\.google\.com/macros/s/[^'"'"']+' script.js | head -1)" \
  -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"company":"【テスト】疎通確認","name":"テスト","email":"test@example.com",
       "formType":"3PL","shipments":"〜100件","area":"関東",
       "warehouse":"1〜100坪","goods":"テスト商材","body":"疎通テストです",
       "page":"https://hashigologi.com/3pl/","referrer":""}'
```

`{"ok":true}` が返れば、シートに1行追加され通知メールが飛びます。
