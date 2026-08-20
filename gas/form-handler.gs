/**
 * 株式会社ハシゴロジ ── お問い合わせフォーム受付
 *
 * サイトから送信された内容をスプレッドシートに1行追記し、
 * 担当者へメールで通知します。
 *
 * 方針：受信した内容は必ず記録します。ボットの疑いがあるものも
 * 捨てずに「判定」列へ印をつけるだけに留めます。誤判定で
 * 問い合わせを失うほうが損失が大きいためです。
 *
 * セットアップ手順は FORM-SETUP.md を参照してください。
 * コードを書き換えたら、必ず
 *   デプロイ → デプロイを管理 → 鉛筆 → バージョン「新バージョン」→ デプロイ
 * を実行してください。保存しただけでは反映されません。
 */

// ---------- 設定 ----------

/** 通知先メールアドレス。カンマ区切りで複数指定できます。 */
var NOTIFY_TO = 'takayuda@hashigo-logi.com';

/** ボットの疑いがある送信でもメール通知するか（falseにすると記録のみ） */
var NOTIFY_ON_SUSPECT = true;

/** 記録先シート名。存在しない場合は自動で作成します。 */
var SHEET_NAME = 'お問い合わせ';

/**
 * スプレッドシートID。
 * このスクリプトをスプレッドシートに紐づけて作成した場合は空のままでOK。
 * 独立したスクリプトとして作った場合のみ、URL中の /d/ と /edit の間の文字列を指定。
 */
var SPREADSHEET_ID = '';

/**
 * メール送信に GmailApp を使うか。
 *   true  … 自分のGmailアカウントから送信。送信済みフォルダに残るため
 *           「本当に送られたか」を目視で確認できる。到達率も高い。
 *   false … MailApp を使用。送信済みには残らない。
 */
var USE_GMAIL_APP = true;

/** 送信者本人にも自動返信を送る場合は true */
var SEND_AUTOREPLY = false;

/** 自動返信の差出人名 */
var AUTOREPLY_NAME = '株式会社ハシゴロジ';

// ---------- 本体 ----------

/**
 * 記録する列。
 *
 * 列を増やすときは必ず「末尾に追加」してください。
 * 途中に挿入すると、既に記録済みの行が見出しとずれて読めなくなります。
 * そのため3PLフォーム用の項目は、管理用の「判定」「メール通知」より後ろに置いています。
 */
var HEADERS = [
  '受信日時', '会社名', '部署・役職', 'お名前',
  '電話番号', 'メールアドレス', 'お問い合わせ内容', '送信元ページ', '参照元',
  '判定', 'メール通知',
  'フォーム種別', '月間出荷件数', '地域', '現在の倉庫坪数', '商材の種類', '想定開始時期'
];
var COL_JUDGE = 10;   // 判定
var COL_MAIL  = 11;   // メール通知

/** 通知メールに載せる列（0始まりのインデックス）。値が空の項目は行ごと省く */
var MAIL_COLS_BASE  = [1, 2, 3, 4, 5];        // 会社名〜メールアドレス
var MAIL_COLS_EXTRA = [11, 12, 13, 14, 15, 16];   // フォーム種別〜想定開始時期
var MAIL_COLS_TAIL  = [6, 7, 8];              // お問い合わせ内容・送信元ページ・参照元

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty_request' });
    }

    var d = JSON.parse(e.postData.contents);

    var company = trim(d.company);
    var name    = trim(d.name);
    var email   = trim(d.email);

    if (!company || !name || !isEmail(email)) {
      console.warn('validation_failed', JSON.stringify(d));
      return json({ ok: false, error: 'validation_failed' });
    }

    // ハニーポット：人には見えない項目に値が入っていたらボットの疑い。
    // ただし記録は必ず行う（ブラウザの自動入力による誤判定を捨てないため）
    var suspect = String(d.address || '').trim() !== '';

    var row = [
      new Date(), company, trim(d.department), name,
      trim(d.phone), email, trim(d.body), trim(d.page), trim(d.referrer),
      suspect ? '自動入力の疑い' : '通常',
      '',
      // 3PLフォーム専用の項目。共通フォームからの送信では空になる
      trim(d.formType) || '共通', trim(d.shipments), trim(d.area),
      trim(d.warehouse), trim(d.goods), trim(d.timing)
    ];

    // 1. まず記録する。何があってもデータを失わない
    var pos = appendRow(row);

    // 2. 次に通知する。失敗しても記録は残る
    var mailStatus;
    try {
      if (suspect && !NOTIFY_ON_SUSPECT) {
        mailStatus = '送信せず（疑いあり）';
      } else if (!NOTIFY_TO) {
        mailStatus = '送信先が未設定';
      } else {
        notify(row, suspect);
        mailStatus = '送信済み → ' + NOTIFY_TO;
      }
    } catch (mailErr) {
      mailStatus = '送信失敗: ' + mailErr.message;
      console.error('mail failed', mailErr);
    }
    pos.sheet.getRange(pos.rowIndex, COL_MAIL).setValue(mailStatus);

    if (SEND_AUTOREPLY && !suspect) {
      try { autoReply(email, name, company); } catch (err) { console.error('autoreply failed', err); }
    }

    return json({ ok: true });

  } catch (err) {
    console.error('doPost failed', err);
    return json({ ok: false, error: 'server_error' });
  }
}

/** デプロイ確認用。ブラウザで /exec を開くと表示されます。 */
function doGet() {
  return json({
    ok: true,
    service: 'hashigologi-contact',
    ready: !!NOTIFY_TO,
    notifyTo: NOTIFY_TO || '(未設定)'
  });
}

/**
 * 設定確認用。エディタ上部の関数選択で selfTest を選んで実行すると、
 * 通知先の設定とメール送信を実際に試します。実行ログに結果が出ます。
 */
function selfTest() {
  console.log('実行アカウント = ' + (Session.getEffectiveUser().getEmail() || '(取得できず)'));
  console.log('NOTIFY_TO = ' + (NOTIFY_TO || '(未設定)'));
  console.log('送信方式 = ' + (USE_GMAIL_APP ? 'GmailApp（送信済みに残る）' : 'MailApp'));
  console.log('残りのメール送信可能数 = ' + MailApp.getRemainingDailyQuota());

  if (!NOTIFY_TO) { console.error('NOTIFY_TO が空です'); return; }

  var subject = '【テスト】ハシゴロジ お問い合わせフォーム '
    + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'HH:mm:ss');

  sendMail({
    to: NOTIFY_TO,
    subject: subject,
    body: 'この文面が届いていれば、メール通知の設定は正常です。\n\n件名: ' + subject
  });

  console.log('送信しました → ' + NOTIFY_TO);
  console.log('件名「' + subject + '」で Gmail を検索してください。');
  if (USE_GMAIL_APP) {
    console.log('GmailApp で送信したので、送信済みフォルダにも残っているはずです。');
  }
}

/**
 * メール送信の共通処理。USE_GMAIL_APP に応じて送信方式を切り替える。
 * GmailApp は送信済みフォルダに残るぶん、送信の有無を確認しやすい。
 */
function sendMail(options) {
  if (USE_GMAIL_APP) {
    GmailApp.sendEmail(options.to, options.subject, options.body, {
      replyTo: options.replyTo,
      name: options.name
    });
  } else {
    MailApp.sendEmail(options);
  }
}

function appendRow(row) {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) throw new Error('spreadsheet_not_found');

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  // 見出し行を HEADERS と突き合わせ、違っていれば書き直す。
  //
  // 列数の比較だけだと、シートに手作業で列を足してあった場合に
  // 「列数は足りているが見出しは古い」状態を見逃し、
  // 新しい項目が無関係な列へ書き込まれてしまう。そのため中身まで比較する。
  // これにより、項目を増やしたあとは次の送信で見出しが自動更新される。
  var needHead = sheet.getLastRow() === 0;
  if (!needHead) {
    var cur = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    for (var i = 0; i < HEADERS.length; i++) {
      if (String(cur[i]).trim() !== HEADERS[i]) { needHead = true; break; }
    }
  }
  if (needHead) {
    var head = sheet.getRange(1, 1, 1, HEADERS.length);
    head.setValues([HEADERS]).setFontWeight('bold')
        .setBackground('#0b2b4d').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(7, 420);
    sheet.setColumnWidth(COL_MAIL, 240);
  }

  sheet.appendRow(row);
  var rowIndex = sheet.getLastRow();
  sheet.getRange(rowIndex, 1).setNumberFormat('yyyy/MM/dd HH:mm:ss');
  return { sheet: sheet, rowIndex: rowIndex };
}

function notify(row, suspect) {
  // 件名にフォーム種別を入れておくと、受信箱で3PLの引き合いを拾いやすい
  var kind = (row[11] && row[11] !== '共通') ? '【' + row[11] + '】' : '';
  var subject = (suspect ? '【要確認】' : '【お問い合わせ】') + kind + row[1] + '　' + row[3] + ' 様';

  var lines = [];
  MAIL_COLS_BASE.forEach(function (i) {
    lines.push(HEADERS[i] + '：' + (row[i] || '（未入力）'));
  });
  // 3PL専用項目は、入力があったものだけ載せる（共通フォームでは1行も出ない）
  MAIL_COLS_EXTRA.forEach(function (i) {
    if (row[i]) lines.push(HEADERS[i] + '：' + row[i]);
  });
  MAIL_COLS_TAIL.forEach(function (i) {
    lines.push(HEADERS[i] + '：' + (row[i] || '（未入力）'));
  });

  var head = suspect
    ? 'サイトのお問い合わせフォームから送信がありました。\n'
      + '※ 自動入力の可能性がある項目に値が入っていました。内容をご確認ください。'
    : 'サイトのお問い合わせフォームから送信がありました。';

  var body = [
    head, '',
    '受信日時：' + Utilities.formatDate(row[0], 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    '',
    lines.join('\n'),
    '', '---',
    '返信は下記アドレス宛に直接お送りいただけます。',
    row[5]
  ].join('\n');

  sendMail({ to: NOTIFY_TO, subject: subject, body: body, replyTo: row[5] });
}

function autoReply(email, name, company) {
  var body = [
    company, name + ' 様', '',
    'この度は株式会社ハシゴロジへお問い合わせいただき、誠にありがとうございます。',
    '下記の内容で受け付けいたしました。',
    '内容を確認のうえ、通常2営業日以内に担当者よりご返信いたします。',
    '', '※ 本メールは自動送信です。', '', '---',
    '株式会社ハシゴロジ',
    '東京都目黒区八雲２−２０−１２',
    '3PL事業／産業廃棄物業者向けDX事業／物流コンサルティング・受託システム開発'
  ].join('\n');

  sendMail({
    to: email,
    subject: 'お問い合わせを受け付けました｜株式会社ハシゴロジ',
    body: body,
    name: AUTOREPLY_NAME
  });
}

// ---------- ユーティリティ ----------

function trim(v) { return String(v == null ? '' : v).trim(); }
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
