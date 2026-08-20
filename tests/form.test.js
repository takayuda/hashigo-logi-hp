const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://127.0.0.1:8899';
let pass = 0, fail = 0;
const ok  = (name, cond, detail='') => { cond ? pass++ : fail++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`); };

const newPage = async (b) => {
  const p = await (await b.newContext({ viewport:{width:1280,height:900} })).newPage();
  await p.route('**://fonts.g**/**', r => r.abort());
  await p.route('**://images.unsplash.com/**', r => r.abort());
  return p;
};
// エンドポイントを差し替え、送信内容を捕まえる
const stub = (p, opts={}) => {
  const state = { payload:null, calls:0 };
  p.route('**://script.google.com/**', async r => {
    state.calls++; state.payload = JSON.parse(r.request().postData());
    if (opts.fail) return r.abort('failed');
    await r.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
  });
  return state;
};

(async () => {
  const b = await chromium.launch();

  console.log('\n[1] 3PLフォームの項目構成');
  let p = await newPage(b);
  await p.goto(BASE + '/3pl/', { waitUntil:'load' });
  const names = await p.evaluate(() => Array.from(document.querySelectorAll('#cform [name]')).map(e => e.name));
  ok('必要な項目が揃っている',
     ['company','department','name','phone','email','shipments','timing','area','warehouse','goods','body','form_type','hp_ref']
       .every(n => names.includes(n)), names.join(','));
  const opts = await p.evaluate(() => {
    const g = id => Array.from(document.getElementById(id).options).map(o => o.value).filter(Boolean);
    return { shipments:g('f6'), timing:g('f7'), area:g('f8'), warehouse:g('f9') };
  });
  ok('月間出荷件数の選択肢が6件', opts.shipments.length === 6, opts.shipments.join(' / '));
  ok('想定開始時期の選択肢が5件', opts.timing.length === 5, opts.timing.join(' / '));
  ok('地域の選択肢が9件', opts.area.length === 9, opts.area.join(' / '));
  ok('倉庫坪数の選択肢がご指定の6件',
     JSON.stringify(opts.warehouse) === JSON.stringify(['倉庫はない','1〜100坪','100〜300坪','300〜500坪','500〜1,000坪','1,000坪以上']),
     opts.warehouse.join(' / '));
  ok('ラベルと入力欄が紐づいている（for/id）', await p.evaluate(() =>
     Array.from(document.querySelectorAll('#cform label[for]')).every(l => document.getElementById(l.htmlFor))));
  ok('ハニーポットが視覚的に隠れている', await p.evaluate(() =>
     document.querySelector('.hp').getBoundingClientRect().left < 0));
  await p.close();

  console.log('\n[2] 入力チェック');
  p = await newPage(b); let s = stub(p);
  await p.goto(BASE + '/3pl/', { waitUntil:'load' });
  await p.click('#fsubmit'); await p.waitForTimeout(300);
  ok('未入力では送信されない', s.calls === 0);
  ok('必須3項目にエラーが付く', await p.evaluate(() => document.querySelectorAll('.fld.bad').length) === 3);
  ok('エラーメッセージが出る', (await p.evaluate(() => document.getElementById('fmsg').className)).includes('ng'));
  await p.fill('#f1','A社'); await p.fill('#f3','山田'); await p.fill('#f5','not-an-email');
  await p.click('#fsubmit'); await p.waitForTimeout(300);
  ok('不正なメールアドレスで送信されない', s.calls === 0);
  await p.fill('#f5','ok@example.com');
  await p.click('#fsubmit'); await p.waitForTimeout(500);
  ok('必須が揃えば送信される', s.calls === 1);
  await p.close();

  console.log('\n[3] 送信内容（全項目）');
  p = await newPage(b); s = stub(p);
  await p.goto(BASE + '/3pl/', { waitUntil:'load' });
  await p.fill('#f1','株式会社テスト'); await p.fill('#f2','物流部 部長');
  await p.fill('#f3','山田 太郎');   await p.fill('#f4','03-1234-5678');
  await p.fill('#f5','test@example.com');
  await p.selectOption('#f6','1,000〜5,000件'); await p.selectOption('#f7','1〜3か月以内');
  await p.selectOption('#f8','近畿');           await p.selectOption('#f9','500〜1,000坪');
  await p.fill('#f10','化粧品・雑貨');
  await p.fill('#f11','他社倉庫からの移管を検討しています。');
  await p.click('#fsubmit'); await p.waitForTimeout(600);
  const exp = { company:'株式会社テスト', department:'物流部 部長', name:'山田 太郎', phone:'03-1234-5678',
    email:'test@example.com', body:'他社倉庫からの移管を検討しています。', formType:'3PL',
    shipments:'1,000〜5,000件', timing:'1〜3か月以内', area:'近畿', warehouse:'500〜1,000坪',
    goods:'化粧品・雑貨', address:'' };
  for (const k of Object.keys(exp)) ok(`  ${k}`, s.payload[k] === exp[k], JSON.stringify(s.payload[k]));
  ok('  送信元ページが3PL', s.payload.page.includes('/3pl/'), s.payload.page);
  ok('送信後に入力欄が消え完了メッセージが残る', await p.evaluate(() => {
    const f = document.getElementById('cform'), m = document.getElementById('fmsg');
    return Array.from(f.children).every(c => c === m || c.style.display === 'none') && m.className.includes('ok');
  }));
  await p.close();

  console.log('\n[4] トップページの共通フォーム（回帰）');
  p = await newPage(b); s = stub(p);
  await p.goto(BASE + '/', { waitUntil:'load' });
  await p.fill('#f1','株式会社サンプル'); await p.fill('#f3','佐藤 花子'); await p.fill('#f5','s@example.com');
  await p.click('#fsubmit'); await p.waitForTimeout(600);
  ok('従来どおり送信できる', s.calls === 1);
  ok('3PL項目は空で送られる',
     ['formType','shipments','timing','area','warehouse','goods'].every(k => s.payload[k] === ''));
  ok('既存項目は従来どおり', s.payload.company === '株式会社サンプル' && s.payload.email === 's@example.com');
  await p.close();

  console.log('\n[5] ハニーポット（ボット除け）');
  p = await newPage(b); s = stub(p);
  await p.goto(BASE + '/3pl/', { waitUntil:'load' });
  await p.fill('#f1','B社'); await p.fill('#f3','鈴木'); await p.fill('#f5','b@example.com');
  await p.evaluate(() => { document.querySelector('[name=hp_ref]').value = 'bot'; });
  await p.click('#fsubmit'); await p.waitForTimeout(600);
  ok('送信自体は行われる（記録を失わない方針）', s.calls === 1);
  ok('address に値が乗りGAS側で判定できる', s.payload.address === 'bot', s.payload.address);
  await p.close();

  console.log('\n[6] 送信失敗時');
  p = await newPage(b); s = stub(p, { fail:true });
  await p.goto(BASE + '/3pl/', { waitUntil:'load' });
  await p.fill('#f1','C社'); await p.fill('#f3','高橋'); await p.fill('#f5','c@example.com');
  await p.click('#fsubmit'); await p.waitForTimeout(900);
  const st = await p.evaluate(() => ({ cls: document.getElementById('fmsg').className,
    html: document.getElementById('fmsg').innerHTML, btn: document.getElementById('fsubmit').disabled,
    label: document.getElementById('fsubmit').textContent }));
  ok('エラーが表示される', st.cls.includes('ng'));
  ok('メールでの連絡先が案内される', st.html.includes('takayuda@hashigo-logi.com'));
  ok('再送信できる状態に戻る', st.btn === false && st.label === '送信する');
  await p.close();

  console.log('\n[7] スマホ（390px）');
  const mp = await (await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })).newPage();
  await mp.route('**://fonts.g**/**', r => r.abort());
  await mp.route('**://images.unsplash.com/**', r => r.abort());
  const ms = stub(mp);
  await mp.goto(BASE + '/3pl/', { waitUntil:'load' });
  await mp.fill('#f1','D社'); await mp.fill('#f3','田中'); await mp.fill('#f5','d@example.com');
  await mp.selectOption('#f6','〜100件');
  await mp.click('#fsubmit'); await mp.waitForTimeout(600);
  ok('スマホでも送信できる', ms.calls === 1 && ms.payload.shipments === '〜100件');
  ok('横スクロールが発生しない',
     await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0);
  await mp.close();

  await b.close();
  console.log(`\n================  ${pass} PASS / ${fail} FAIL  ================`);
  process.exit(fail ? 1 : 0);
})();
