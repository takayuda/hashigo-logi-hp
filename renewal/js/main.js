(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ページを開いたときの表示位置 ----------
     前のページのスクロール位置が引き継がれて途中から表示されることがあるため、
     #付きのリンク以外は必ず先頭から表示する。
     ・ブラウザの位置復元を止める
     ・読み込み直後から約1.5秒間は、利用者が自分でスクロールするまで先頭に合わせ続ける
       （表示環境が読み込み後に位置を戻してくる場合にも負けないように）
     ・サイト内リンクを押したら、移動する前に先頭へ戻しておく */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const root = document.documentElement;
  const toTop = () => {
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto"; // スムーズスクロールで流れて見えないように
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
    else { window.scrollTo(0, 0); root.scrollTop = 0; document.body.scrollTop = 0; }
    root.style.scrollBehavior = prev;
  };
  let userScrolled = false;
  const markUser = () => { userScrolled = true; };
  ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) =>
    window.addEventListener(ev, markUser, { passive: true, once: true }));
  const holdTop = (ms) => {
    const until = performance.now() + ms;
    const tick = () => {
      if (userScrolled) return;
      toTop();
      if (performance.now() < until) requestAnimationFrame(tick);
    };
    tick();
  };
  toTop();
  document.addEventListener("DOMContentLoaded", toTop, { once: true });
  window.addEventListener("load", () => holdTop(1500), { once: true });
  // 戻る・進むでキャッシュから表示されたときも同じ扱いにする
  window.addEventListener("pageshow", (e) => { if (e.persisted) { userScrolled = false; holdTop(1500); } });
  // サイト内リンク：移動前に先頭へ戻す（ページ内の#リンクと新しいタブで開く操作は除く）
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:)/.test(href) || a.target === "_blank") return;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  });

  /* ---------- ヘッダー：FVを過ぎたら白背景に切り替える ---------- */
  const hd = document.getElementById("hd");
  // トップはFV、下層ページは data-hero を付けたヒーローを過ぎたら切り替える
  const fv = document.querySelector(".fv, [data-hero]");
  const updateHeader = () => {
    const limit = fv ? fv.offsetHeight - hd.offsetHeight : 0;
    hd.classList.toggle("is-solid", window.scrollY > limit);
  };
  // スマホ用の追従CTA（下層LPのみ）は、ヒーローを過ぎたら出す
  const fixcta = document.getElementById("fixcta");
  const updateFixCta = () => {
    if (!fixcta || !fv) return;
    fixcta.classList.toggle("is-show", window.scrollY > fv.offsetHeight * 0.6);
  };
  const onScroll = () => { updateHeader(); updateFixCta(); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateHeader);

  /* ---------- スマホ用メニュー ---------- */
  const menuBtn = document.getElementById("menuBtn");
  const drawer = document.getElementById("drawer");
  const setMenu = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    drawer.hidden = !open;
    document.body.classList.toggle("is-menu-open", open);
  };
  menuBtn.addEventListener("click", () => setMenu(drawer.hidden));
  drawer.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) setMenu(false); });

  /* ---------- FVスライドショー ---------- */
  const INTERVAL = 6000;
  const FADE = 1600; // CSSの .fv-slide の transition と揃える
  const slides = Array.from(document.querySelectorAll(".fv-slide"));
  if (slides.length > 1) {
    let current = 0;
    let timer = null;
    let leaveTimer = null;

    // 2枚目以降は1枚目の表示後に読み込み、初期表示を軽くする
    const load = (slide) => {
      const img = slide.querySelector("img[data-src]");
      if (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
      return slide.querySelector("img");
    };
    window.addEventListener("load", () => slides.forEach(load));

    // 画像のデコードが終わってから切り替える（読み込み途中の画像が一瞬映るのを防ぐ）
    const ready = (img) =>
      img.decode ? img.decode().catch(() => {}) : Promise.resolve();

    const show = (next) => {
      const prev = slides[current];
      const incoming = slides[next];
      return ready(load(incoming)).then(() => {
        clearTimeout(leaveTimer);
        slides.forEach((s) => { if (s !== prev) s.classList.remove("is-leaving"); });
        prev.classList.remove("is-active");
        prev.classList.add("is-leaving");
        incoming.classList.add("is-active");
        current = next;
        // フェードが終わってから前の1枚を外す
        leaveTimer = setTimeout(() => prev.classList.remove("is-leaving"), FADE + 100);
      });
    };

    // 切り替えが終わってから次を予約する（デコード待ちで切り替えが重ならないように）
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        show((current + 1) % slides.length).then(schedule);
      }, INTERVAL);
    };

    if (!reduceMotion) {
      schedule();
      // タブが非表示の間は止める
      document.addEventListener("visibilitychange", () => {
        clearTimeout(timer);
        if (!document.hidden) schedule();
      });
    }
  }

  /* ---------- スクロールで要素を表示 ---------- */
  const targets = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add("is-in"));
  }
})();
