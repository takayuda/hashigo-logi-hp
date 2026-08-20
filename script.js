// ヘッダー：スクロールで白背景に、下方向スクロールで隠す
var hd = document.getElementById('hd');
// 下層ページ（page-doc）は白背景なのでヘッダーを常に solid のままにする
var alwaysSolid = document.body.classList.contains('page-doc');
// 事業詳細ページ（page-lp）は追従アンカーがヘッダー直下に貼り付くため、
// ヘッダーを隠すと目次だけが浮いてしまう。隠す挙動を無効にする
var neverHide = document.body.classList.contains('page-lp');
var lastY = window.scrollY, ticking = false;
function headerUpdate(){
  if(!hd) return;
  var y = window.scrollY;
  if(!alwaysSolid){ hd.classList.toggle('solid', y > 40); }
  if(!neverHide && !document.body.classList.contains('nav-open')){
    hd.classList.toggle('hide', y > 400 && y > lastY + 4);
  }
  lastY = y; ticking = false;
}
if(hd){
  window.addEventListener('scroll', function(){
    if(!ticking){ window.requestAnimationFrame(headerUpdate); ticking = true; }
  }, {passive:true});
  headerUpdate();
}

// フルスクリーンメニュー
var btn = document.getElementById('navBtn'), ovl = document.getElementById('ovl');
if(btn && ovl){
function setMenu(open){
  ovl.classList.toggle('open', open);
  document.body.classList.toggle('nav-open', open);
  ovl.setAttribute('aria-hidden', open ? 'false' : 'true');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  if(open){ hd.classList.remove('hide'); }
}
btn.addEventListener('click', function(){ setMenu(!ovl.classList.contains('open')); });
ovl.querySelectorAll('a').forEach(function(a){
  a.addEventListener('click', function(){ setMenu(false); });
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && ovl.classList.contains('open')){ setMenu(false); }
});
}

// スクロール表示
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var items = document.querySelectorAll('.rv');
if(reduce || !('IntersectionObserver' in window)){
  items.forEach(function(el){ el.classList.add('in'); });
}else{
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:.08, rootMargin:'0px 0px -6% 0px'});
  items.forEach(function(el,i){ el.style.transitionDelay = (Math.min(i%3,2)*90)+'ms'; io.observe(el); });
}

/* ==========================================================
   事業詳細ページ（page-lp）専用
   ---------------------------------------------------------
   該当する要素がないページでは何も起きない
   ========================================================== */

// 追従アンカー：いま見ているセクションに下線を出す
(function(){
  var links = Array.prototype.slice.call(document.querySelectorAll('.lp-anchor a'));
  if(!links.length || !('IntersectionObserver' in window)) return;
  var secs = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var so = new IntersectionObserver(function(es){
    es.forEach(function(e){
      var i = secs.indexOf(e.target);
      if(i < 0 || !e.isIntersecting) return;
      links.forEach(function(l){ l.classList.remove('on'); });
      links[i].classList.add('on');
    });
  }, {rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(function(s){ if(s) so.observe(s); });
})();

// SP用 追従CTA：メインビジュアルを過ぎたら出し、最後のCTAが見えたら引っ込める
(function(){
  var bar = document.getElementById('fixcta');
  if(!bar) return;
  var cta = document.querySelector('.cta');
  function upd(){
    var passedHero = window.scrollY > 520;
    var atCta = cta && cta.getBoundingClientRect().top < window.innerHeight - 60;
    bar.classList.toggle('on', passedHero && !atCta);
  }
  window.addEventListener('scroll', upd, {passive:true});
  window.addEventListener('resize', upd);
  upd();
})();

/* ==========================================================
   お問い合わせフォーム
   ---------------------------------------------------------
   FORM_ENDPOINT に Google Apps Script のウェブアプリURL
   （https://script.google.com/macros/s/.../exec）を設定すると
   送信が有効になります。設定手順は FORM-SETUP.md を参照。
   空のままの場合は「準備中」の案内だけを表示します。
   ========================================================== */
var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwCpNkAScTmRC7dt12FPsYJV5GHjl8hHf79odBZk_8ig0gvTX92zV5mi5M5GXpL4EtZ/exec';
var FALLBACK_MAIL = 'takayuda@hashigo-logi.com';   // 送信失敗時に案内するメールアドレス

(function(){
  var form = document.getElementById('cform');
  if(!form) return;
  var btn  = document.getElementById('fsubmit');
  var note = document.getElementById('fnote');
  var msg  = document.getElementById('fmsg');

  function showMsg(kind, html){
    msg.className = 'form-msg show ' + kind;
    msg.innerHTML = html;
  }
  function fieldEl(name){ return form.elements[name]; }
  // ページによって項目が異なるため、無い項目は空文字として扱う
  // （トップページの共通フォームには3PL専用の項目がない）
  function optVal(name){ var el = form.elements[name]; return el ? String(el.value).trim() : ''; }
  function markBad(el, bad){
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    var box = el.closest('.fld');
    if(box) box.classList.toggle('bad', bad);
  }

  function validate(){
    var bad = null;
    [['company', function(v){ return v.length > 0; }],
     ['name',    function(v){ return v.length > 0; }],
     ['email',   function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }]
    ].forEach(function(rule){
      var el = fieldEl(rule[0]);
      var ok = rule[1](el.value.trim());
      markBad(el, !ok);
      if(!ok && !bad) bad = el;
    });
    return bad;
  }

  ['company','name','email'].forEach(function(n){
    fieldEl(n).addEventListener('input', function(){
      if(this.getAttribute('aria-invalid') === 'true') validate();
    });
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();

    var bad = validate();
    if(bad){
      showMsg('ng', '未入力の必須項目があります。ご確認のうえ、もう一度お試しください。');
      bad.focus();
      return;
    }

    if(!FORM_ENDPOINT){
      note.textContent = '';
      showMsg('ng', 'フォームの送信機能は現在準備中です。お手数ですが、直接メールにてご連絡ください。');
      return;
    }

    var payload = {
      company:    fieldEl('company').value.trim(),
      department: fieldEl('department').value.trim(),
      name:       fieldEl('name').value.trim(),
      phone:      fieldEl('phone').value.trim(),
      email:      fieldEl('email').value.trim(),
      body:       fieldEl('body').value.trim(),
      // 以下は3PLページのフォームにのみある項目
      formType:   optVal('form_type'),
      shipments:  optVal('shipments'),
      timing:     optVal('timing'),
      area:       optVal('area'),
      warehouse:  optVal('warehouse'),
      goods:      optVal('goods'),
      address:    fieldEl('hp_ref').value.trim(),   // ハニーポット（GAS側は address で判定）
      page:       location.href,
      referrer:   document.referrer
    };

    btn.disabled = true;
    btn.textContent = '送信中…';
    msg.className = 'form-msg';

    // text/plain で送ることでプリフライトを避ける（Apps Script 側で JSON として解釈）
    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload)
    })
    .then(function(res){ return res.json(); })
    .then(function(data){
      if(!data || !data.ok) throw new Error((data && data.error) || 'unknown');
      // 入力欄・ボタン・注記を消し、完了メッセージだけを残す
      Array.prototype.forEach.call(form.children, function(el){
        if(el !== msg) el.style.display = 'none';
      });
      showMsg('ok',
        'お問い合わせありがとうございます。<br>' +
        '内容を確認のうえ、通常2営業日以内にご返信いたします。');
    })
    .catch(function(){
      btn.disabled = false;
      btn.textContent = '送信する';
      var mail = FALLBACK_MAIL
        ? '<a href="mailto:' + FALLBACK_MAIL + '">' + FALLBACK_MAIL + '</a> 宛にご連絡ください。'
        : '直接メールにてご連絡ください。';
      showMsg('ng', '送信に失敗しました。時間をおいて再度お試しいただくか、' + mail);
    });
  });
})();
