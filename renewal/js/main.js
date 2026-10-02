(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ヘッダー：FVを過ぎたら白背景に切り替える ---------- */
  const hd = document.getElementById("hd");
  const fv = document.querySelector(".fv");
  const updateHeader = () => {
    const limit = fv ? fv.offsetHeight - hd.offsetHeight : 0;
    hd.classList.toggle("is-solid", window.scrollY > limit);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
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
  const slides = Array.from(document.querySelectorAll(".fv-slide"));
  const bar = document.getElementById("fvBar");
  if (slides.length > 1) {
    bar.style.setProperty("--fv-interval", INTERVAL + "ms");
    const ticks = slides.map(() => bar.appendChild(document.createElement("i")));
    let current = 0;

    // 2枚目以降は1枚目の表示後に読み込み、初期表示を軽くする
    const load = (slide) => {
      const img = slide.querySelector("img[data-src]");
      if (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
    };
    window.addEventListener("load", () => slides.forEach(load));

    const show = (next) => {
      load(slides[next]);
      slides[current].classList.remove("is-active");
      slides[next].classList.add("is-active");
      ticks.forEach((t, i) => {
        t.classList.toggle("is-done", i < next);
        t.classList.remove("is-active");
      });
      void ticks[next].offsetWidth; // アニメーションを先頭から再生させる
      ticks[next].classList.add("is-active");
      current = next;
    };
    show(0);

    if (!reduceMotion) {
      let timer = setInterval(() => show((current + 1) % slides.length), INTERVAL);
      // タブが非表示の間は止める
      document.addEventListener("visibilitychange", () => {
        clearInterval(timer);
        if (!document.hidden) {
          show(current);
          timer = setInterval(() => show((current + 1) % slides.length), INTERVAL);
        }
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
