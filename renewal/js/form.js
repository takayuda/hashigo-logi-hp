/* =========================================================
   フォーム送信（お問い合わせ・見積依頼・資料請求で共通）
   ---------------------------------------------------------
   送信先は現行サイトと同じ Google Apps Script（gas/form-handler.gs）。
   GAS が列として受け取る項目（company / department / name / phone / email /
   body / formType / shipments / timing / area / warehouse / goods）はそのまま送り、
   それ以外の項目（data-extra を付けたもの）は「項目名：値」の形で本文の先頭にまとめる。
   ========================================================= */
(() => {
  "use strict";

  const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwCpNkAScTmRC7dt12FPsYJV5GHjl8hHf79odBZk_8ig0gvTX92zV5mi5M5GXpL4EtZ/exec";
  const FALLBACK_MAIL = "takayuda@hashigo-logi.com";
  const GAS_FIELDS = ["shipments", "timing", "area", "warehouse", "goods"];
  // 送信完了後に出す、Googleカレンダーの予約ページ（オンライン面談の日程予約）
  const BOOKING_URL = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0fn-fzi5bvRf1T6FZ0hOYL7RDdftkltV5hj54MosoYjQkP2jvzulfavIX4SD3J1TSro0zoHZA6?gv=true";

  const form = document.getElementById("cform");
  if (!form) return;
  const btn = document.getElementById("fsubmit");
  const msg = document.getElementById("fmsg");
  const val = (name) => {
    const el = form.elements[name];
    return el && "value" in el ? String(el.value).trim() : "";
  };

  const showMsg = (kind, html) => {
    msg.className = "form-msg show " + kind;
    msg.innerHTML = html;
  };

  // 必須チェック（会社名・お名前・メールアドレス）
  const rules = {
    company: (v) => v.length > 0,
    name: (v) => v.length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  };
  const validate = () => {
    let first = null;
    Object.keys(rules).forEach((n) => {
      const el = form.elements[n];
      if (!el) return;
      const ok = rules[n](el.value.trim());
      el.setAttribute("aria-invalid", ok ? "false" : "true");
      el.closest(".fld")?.classList.toggle("bad", !ok);
      if (!ok && !first) first = el;
    });
    return first;
  };
  Object.keys(rules).forEach((n) => {
    form.elements[n]?.addEventListener("input", function () {
      if (this.getAttribute("aria-invalid") === "true") validate();
    });
  });

  // data-extra の項目を「項目名：値」にまとめる（チェックボックスは選択肢を読点でつなぐ）
  const extras = () => {
    const lines = [];
    form.querySelectorAll("[data-extra]").forEach((box) => {
      const label = box.dataset.extra;
      const checks = box.querySelectorAll("input[type=checkbox]");
      let v;
      if (checks.length) v = [...checks].filter((c) => c.checked).map((c) => c.value).join("、");
      else v = String(box.value || "").trim();
      if (v) lines.push(label + "：" + v);
    });
    return lines;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad) {
      showMsg("ng", "未入力の必須項目があります。ご確認のうえ、もう一度お試しください。");
      bad.focus();
      return;
    }

    const extra = extras();
    const body = [extra.join("\n"), val("body")].filter(Boolean).join("\n\n");
    const payload = {
      company: val("company"), department: val("department"), name: val("name"),
      phone: val("phone"), email: val("email"), body,
      formType: val("form_type"),
      address: val("hp_ref"), // ハニーポット（GAS側は address で判定）
      page: location.href, referrer: document.referrer,
    };
    GAS_FIELDS.forEach((k) => { payload[k] = val(k); });

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "送信中…";
    msg.className = "form-msg";

    // text/plain で送り、プリフライトを避ける（Apps Script 側で JSON として解釈）
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.ok) throw new Error((data && data.error) || "unknown");
        [...form.children].forEach((el) => { if (el !== msg) el.style.display = "none"; });
        let done = form.dataset.done || "送信しました。内容を確認のうえ、通常2営業日以内にご連絡いたします。";
        // 資料請求：送信できたらダウンロードボタンを出す（data-download に PDF のパス）
        if (form.dataset.download) {
          done += '<br><a class="dl-btn" href="' + form.dataset.download + '" download target="_blank" rel="noopener">'
            + '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v9m0 0L4.5 6.5M8 10l3.5-3.5M2 13.5h12" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
            + "資料をダウンロード（PDF）</a>";
        }
        showMsg("ok", done);
        // 予約ページは送信が済んでから読み込む（フォーム入力中は通信しない）
        if (BOOKING_URL && !form.querySelector(".booking")) {
          const box = document.createElement("div");
          box.className = "booking";
          box.innerHTML = '<p class="booking-h">オンライン面談のご予約</p>'
            + '<p class="booking-lead">お話を直接お聞きしたい場合は、ご都合のよい日時をこちらからお選びください。担当者からのご連絡を待たずに、そのままご予約いただけます。</p>'
            + '<iframe src="' + BOOKING_URL + '" title="オンライン面談の予約" loading="lazy"></iframe>';
          form.appendChild(box);
        }
        msg.scrollIntoView({ block: "start" });
      })
      .catch(() => {
        btn.disabled = false;
        btn.textContent = label;
        showMsg("ng", '送信に失敗しました。時間をおいて再度お試しいただくか、<a href="mailto:' + FALLBACK_MAIL + '">' + FALLBACK_MAIL + "</a> 宛にご連絡ください。");
      });
  });
})();
