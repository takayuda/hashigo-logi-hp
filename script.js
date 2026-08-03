// ヘッダー：スクロールで白背景に、下方向スクロールで隠す
var hd = document.getElementById('hd');
var lastY = window.scrollY, ticking = false;
function headerUpdate(){
  var y = window.scrollY;
  hd.classList.toggle('solid', y > 40);
  if(!document.body.classList.contains('nav-open')){
    hd.classList.toggle('hide', y > 400 && y > lastY + 4);
  }
  lastY = y; ticking = false;
}
window.addEventListener('scroll', function(){
  if(!ticking){ window.requestAnimationFrame(headerUpdate); ticking = true; }
}, {passive:true});
headerUpdate();

// フルスクリーンメニュー
var btn = document.getElementById('navBtn'), ovl = document.getElementById('ovl');
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

// お問い合わせフォーム（送信先未設定のため、現状は案内のみ）
document.getElementById('cform').addEventListener('submit', function(e){
  e.preventDefault();
  document.getElementById('fnote').textContent =
    'フォームの送信機能は現在準備中です。お手数ですが、直接メールにてご連絡ください。';
});
