/**
 * 株式会社ハシゴロジ ── お問い合わせフォーム受付
 *
 * サイトから送信された内容をスプレッドシートに1行追記し、
 * 担当者へメールで通知します。
 *
 * セットアップ手順は FORM-SETUP.md を参照してください。
 * 要点だけ：
 *   1. 記録先のスプレッドシートを開く
 *   2. 拡張機能 → Apps Script でこのファイルの内容を貼り付ける
 *   3. 下の NOTIFY_TO を設定する
 *   4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *      実行ユーザー：自分／アクセスできるユーザー：全員
 *   5. 発行された /exec URL を script.js の FORM_ENDPOINT に貼る
 */

// ---------- 設定 ----------

/** 通知先メールアドレス。カンマ区切りで複数指定できます。 */
var NOTIFY_TO = '';

/** 記録先シート名。存在しない場合は自動で作成します。 */
var SHEET_NAME = 'お問い合わせ';

/**
 * スプレッドシートID。
 * このスクリプトをスプレッドシートに紐づけて作成した場合は空のままでOK
 * （紐づいたシートに書き込みます）。
 * 独立したスクリプトとして作る場合のみ、URL中の /d/ と /edit の間の文字列を指定。
 */
var SPREADSHEET_ID = '';

/** 送信者本人にも自動返信を送る場合は true */
var SEND_AUTOREPLY = false;

/** 自動返信の差出人名 */
var AUTOREPLY_NAME = '株式会社ハシゴロジ';

// ---------- 本体 ----------

var HEADERS = [
  '受信日時', '会社名', '部署・役職', 'お名前',
  '電話番号', 'メールアドレス', 'お問い合わせ内容', '送信元ページ', '参照元'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty_request' });
    }

    var d = JSON.parse(e.postData.contents);

    // ハニーポット：人が触らない項目に値が入っていたらボットとみなし、
    // 記録も通知もせず正常応答だけ返す
    if (String(d.address || '').trim() !== '') {
      return json({ ok: true });
    }

    var company = trim(d.company);
    var name    = trim(d.name);
    var email   = trim(d.email);

    if (!company || !name || !isEmail(email)) {
      return json({ ok: false, error: 'validation_failed' });
    }

    var row = [
      new Date(),
      company,
      trim(d.department),
      name,
      trim(d.phone),
      email,
      trim(d.body),
      trim(d.page),
      trim(d.referrer)
    ];

    appendRow(row);
    notify(row);
    if (SEND_AUTOREPLY) autoReply(email, name, company);

    return json({ ok: true });

  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server_error' });
  }
}

/** デプロイ確認用。ブラウザで /exec を開くと表示されます。 */
function doGet() {
  return json({ ok: true, service: 'hashigologi-contact', ready: !!NOTIFY_TO });
}

function appendRow(row) {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) throw new Error('spreadsheet_not_found');

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // 見出し行がなければ作る
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var head = sheet.getRange(1, 1, 1, HEADERS.length);
    head.setFontWeight('bold').setBackground('#0b2b4d').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);   // 受信日時
    sheet.setColumnWidth(7, 420);   // お問い合わせ内容
  }

  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('yyyy/MM/dd HH:mm:ss');
}

function notify(row) {
  if (!NOTIFY_TO) return;

  var subject = '【お問い合わせ】' + row[1] + '　' + row[3] + ' 様';

  var lines = [];
  for (var i = 1; i < HEADERS.length; i++) {
    lines.push(HEADERS[i] + '：' + (row[i] || '（未入力）'));
  }

  var body = [
    'サイトのお問い合わせフォームから送信がありました。',
    '',
    '受信日時：' + Utilities.formatDate(row[0], 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    '',
    lines.join('\n'),
    '',
    '---',
    '返信は下記アドレス宛に直接お送りいただけます。',
    row[5]
  ].join('\n');

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: subject,
    body: body,
    replyTo: row[5]
  });
}

function autoReply(email, name, company) {
  var body = [
    company,
    name + ' 様',
    '',
    'この度は株式会社ハシゴロジへお問い合わせいただき、誠にありがとうございます。',
    '下記の内容で受け付けいたしました。',
    '内容を確認のうえ、通常2営業日以内に担当者よりご返信いたします。',
    '',
    '※ 本メールは自動送信です。',
    '',
    '---',
    '株式会社ハシゴロジ',
    '東京都目黒区',
    '3PL事業／産業廃棄物業者向けDX事業／物流コンサルティング・受託システム開発'
  ].join('\n');

  MailApp.sendEmail({
    to: email,
    subject: 'お問い合わせを受け付けました｜株式会社ハシゴロジ',
    body: body,
    name: AUTOREPLY_NAME
  });
}

// ---------- ユーティリティ ----------

function trim(v) {
  return String(v == null ? '' : v).trim();
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
