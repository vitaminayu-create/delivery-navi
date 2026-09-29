"use strict";

/* ==========================================================
   配送ナビ（試作版） app.js
   - data/*.js が window.DELIVERY_NAVI_DATA にセットしたデータを読んで画面を組み立てる
   - 画面遷移はスタック方式（履歴を配列で管理）
   ========================================================== */

const MEMO_CATEGORIES = ["マークの質問", "商品の質問", "手続き", "要望・不満", "脱退の相談", "その他"];
const MEMO_REACTIONS = ["満足", "普通", "不満", "不明"];
const MEMO_SHARE_OPTIONS = ["自分用", "チームに共有"];
const MEMO_STORAGE_KEY = "deliveryNaviMemos";

const SCREEN_TITLES = {
  "home": "配送ナビ",
  "safety-menu": "食の安全・表示",
  "catalog": "カタログマーク",
  "cultivation": "栽培基準",
  "gmo": "遺伝子組み換え（GMO）",
  "allergen": "アレルゲン",
  "additives": "添加物",
  "producers": "地元の生産者",
  "procedures": "手続き・利用案内",
  "mark-detail": "検索結果",
  "memo": "メモ・声の記録"
};

const CATALOG_CATEGORY_ORDER = ["delivery_form", "supply_schedule", "cooking", "other", "original", "points"];

const COLOR_HEX = {
  "紫": "#6B4C8A",
  "青紫": "#5A4E8C",
  "青緑": "#2E7D6B",
  "青": "#2F6690",
  "緑": "#3E7A4C",
  "赤": "#9C3B3B",
  "黄": "#B8912B",
  "灰": "#6B6B63",
  "黒": "#2B2B28",
  "ピンク": "#C46A8C",
  "茶": "#7A5230"
};

let DATA = {
  marks: null,
  procedures: null,
  producers: null,
  links: null
};

let SEARCH_INDEX = []; // [{ categoryName, item }]
let navStack = ["home"];
let pendingMemoPreset = null;

/* ---------- 起動 ---------- */

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindStaticEvents();

  const loaded = window.DELIVERY_NAVI_DATA || {};
  const missing = ["marks", "procedures", "producers", "links"].filter((key) => !loaded[key]);

  if (missing.length > 0) {
    showLoadError(missing);
    return;
  }

  DATA.marks = loaded.marks;
  DATA.procedures = loaded.procedures;
  DATA.producers = loaded.producers;
  DATA.links = loaded.links;

  try {
    buildSearchIndex();
    renderCatalog();
    renderCultivation();
    renderGmo();
    renderAllergen();
    renderAdditives();
    renderProducers();
    renderProcedures();
    setupMemoForm();
    renderMemoList();
    render();
  } catch (err) {
    showLoadError([], err);
  }
}

function showLoadError(missingKeys, err) {
  const box = document.getElementById("load-error");
  let message = "データの読み込みに失敗しました。data フォルダの.jsファイルを編集した場合は、"
    + "「\"」「,」「{ }」「[ ]」の対応が崩れていないか確認してください。1か所の入力ミスでも画面全体が表示されなくなります。";
  if (missingKeys && missingKeys.length > 0) {
    message += "（読み込めなかったデータ：" + missingKeys.join("、") + "）";
  }
  if (err) {
    message += "（詳細：" + err.message + "）";
  }
  box.textContent = message;
  box.classList.remove("hidden");
}

/* ---------- 画面遷移 ---------- */

function bindStaticEvents() {
  document.getElementById("btn-home").addEventListener("click", () => {
    navStack = ["home"];
    render();
  });
  document.getElementById("btn-back").addEventListener("click", goBack);

  document.querySelectorAll(".menu-btn[data-target]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.target));
  });

  document.querySelectorAll(".menu-btn[data-link]").forEach((btn) => {
    btn.addEventListener("click", () => openExternalLink(btn.dataset.link));
  });

  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
}

function navigateTo(screenId) {
  navStack.push(screenId);
  render();
}

function goBack() {
  if (navStack.length > 1) {
    navStack.pop();
    render();
  }
}

function render() {
  const current = navStack[navStack.length - 1];
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById("screen-" + current);
  if (target) target.classList.add("active");

  document.getElementById("screen-title").textContent = SCREEN_TITLES[current] || "配送ナビ";
  document.getElementById("btn-back").classList.toggle("hidden", navStack.length <= 1);
  document.getElementById("btn-home").classList.toggle("hidden", current === "home");

  if (current === "memo") {
    applyPendingMemoPreset();
  }

  window.scrollTo(0, 0);
}

function openExternalLink(linkKey) {
  const link = DATA.links && DATA.links[linkKey];
  if (!link) return;
  window.open(link.url, "_blank", "noopener");
}

/* ---------- 共通：DOM生成ヘルパー ---------- */

function el(tag, opts, children) {
  const node = document.createElement(tag);
  opts = opts || {};
  if (opts.class) node.className = opts.class;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.href !== undefined) node.href = opts.href;
  if (opts.target) node.target = opts.target;
  if (opts.rel) node.rel = opts.rel;
  if (opts.attrs) {
    Object.keys(opts.attrs).forEach((k) => node.setAttribute(k, opts.attrs[k]));
  }
  (children || []).forEach((c) => {
    if (c) node.appendChild(c);
  });
  return node;
}

function getBadgeColorHex(colorStr) {
  if (!colorStr || colorStr === "―") return COLOR_HEX["灰"];
  const keys = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (colorStr.indexOf(key) !== -1) return COLOR_HEX[key];
  }
  return "#6B6558";
}

function sourceLinkNode() {
  const link = DATA.links && DATA.links.catalogMark;
  if (!link) return null;
  const p = el("p", { class: "source-label" }, [document.createTextNode("出典：")]);
  const a = el("a", { class: "source-link", href: link.url, target: "_blank", rel: "noopener", text: link.label });
  p.appendChild(a);
  return p;
}

function buildMarkCard(item) {
  const card = el("div", { class: "mark-card" });

  const head = el("div", { class: "mark-card-head" });
  const badge = el("span", { class: "mark-badge", text: item.mark });
  if (item.color) {
    badge.style.background = getBadgeColorHex(item.color);
  }
  head.appendChild(badge);
  if (item.color && item.color !== "―") {
    head.appendChild(el("span", { class: "mark-color-label", text: "色：" + item.color }));
  }
  if (item.nameStatus) {
    head.appendChild(el("span", { class: "status-flag", text: item.nameStatus }));
  }
  card.appendChild(head);

  card.appendChild(el("p", { class: "official-label", text: "公式説明" }));
  card.appendChild(el("p", { class: "official-text", text: item.official }));

  if (item.isPattern && item.patternNote) {
    card.appendChild(el("p", { class: "pattern-note", text: "この表示について：" + item.patternNote }));
  }

  card.appendChild(el("hr", { class: "divider" }));
  card.appendChild(el("p", { class: "note-label", text: "組合員への一言" }));
  card.appendChild(el("p", { class: "member-note-text", text: item.memberNote }));

  const src = sourceLinkNode();
  if (src) card.appendChild(src);

  return card;
}

/* ---------- カタログマーク画面 ---------- */

function renderCatalog() {
  const container = document.getElementById("catalog-content");
  container.textContent = "";
  CATALOG_CATEGORY_ORDER.forEach((catId) => {
    const cat = DATA.marks.categories.find((c) => c.id === catId);
    if (!cat) return;
    container.appendChild(el("h2", { class: "category-heading", text: cat.name }));
    cat.items.forEach((item) => container.appendChild(buildMarkCard(item)));
  });
}

/* ---------- 栽培基準画面 ---------- */

function renderCultivation() {
  const container = document.getElementById("cultivation-content");
  container.textContent = "";
  const cat = DATA.marks.categories.find((c) => c.id === "cultivation");
  if (!cat) return;
  cat.items.forEach((item) => container.appendChild(buildMarkCard(item)));
}

/* ---------- GMO画面 ---------- */

function renderGmo() {
  const container = document.getElementById("gmo-content");
  container.textContent = "";
  const cat = DATA.marks.categories.find((c) => c.id === "gmo");
  if (!cat) return;

  if (cat.intro) {
    container.appendChild(el("p", { class: "notice-box warning", text: cat.intro.warning }));
    container.appendChild(el("p", { class: "official-label", text: "解説文（カタログ原文）" }));
    container.appendChild(el("p", { class: "official-text", text: cat.intro.explanation }));
    container.appendChild(el("p", { class: "official-text", text: cat.intro.note }));
  }

  cat.items.forEach((item) => container.appendChild(buildMarkCard(item)));
}

/* ---------- アレルゲン画面 ---------- */

function renderAllergen() {
  const container = document.getElementById("allergen-content");
  container.textContent = "";
  const cat = DATA.marks.categories.find((c) => c.id === "allergen");
  if (!cat) return;
  cat.items.forEach((item) => container.appendChild(buildMarkCard(item)));
}

/* ---------- 添加物画面 ---------- */

function renderAdditives() {
  const container = document.getElementById("additives-content");
  container.textContent = "";
  const status = DATA.marks.additives && DATA.marks.additives.status;
  if (status) {
    container.appendChild(el("p", { class: "notice-box", text: status }));
  }
}

/* ---------- 地元の生産者画面 ---------- */

function renderProducers() {
  const container = document.getElementById("producers-content");
  container.textContent = "";
  (DATA.producers.items || []).forEach((p) => {
    const card = el("div", { class: "mark-card" });
    if (p.isSample) {
      card.appendChild(el("span", { class: "sample-flag", text: p.sampleLabel || "サンプル（架空）" }));
    }
    card.appendChild(el("p", { class: "producer-field-label", text: "生産者名" }));
    card.appendChild(el("p", { class: "producer-field-value", text: p.name }));
    card.appendChild(el("p", { class: "producer-field-label", text: "地域" }));
    card.appendChild(el("p", { class: "producer-field-value", text: p.area }));
    card.appendChild(el("p", { class: "producer-field-label", text: "主な品目" }));
    card.appendChild(el("p", { class: "producer-field-value", text: p.mainProducts }));
    card.appendChild(el("p", { class: "producer-field-label", text: "組合員への一言" }));
    card.appendChild(el("p", { class: "producer-field-value", text: p.comment }));
    container.appendChild(card);
  });
  if (DATA.producers.note) {
    container.appendChild(el("p", { class: "notice-box", text: DATA.producers.note }));
  }
}

/* ---------- 手続き・利用案内画面 ---------- */

function renderProcedures() {
  const container = document.getElementById("procedures-content");
  container.textContent = "";

  (DATA.procedures.items || []).forEach((proc) => {
    const card = el("div", { class: "mark-card" });
    card.appendChild(el("p", { class: "procedure-title", text: proc.title }));

    if (proc.isSpecial && proc.id === "withdrawal") {
      card.appendChild(el("p", { class: "procedure-summary", text: proc.note }));
      const phone = el("a", {
        class: "withdrawal-phone",
        href: "tel:" + proc.officePhone.replace(/[^0-9]/g, ""),
        text: "☎ " + proc.officePhone
      });
      card.appendChild(phone);
      card.appendChild(el("p", { class: "withdrawal-hours", text: proc.officeHours }));
      const recordBtn = el("button", { class: "secondary-btn", text: proc.recordButtonLabel, attrs: { type: "button" } });
      recordBtn.addEventListener("click", () => {
        pendingMemoPreset = proc.memoCategoryPreset;
        navigateTo("memo");
      });
      card.appendChild(recordBtn);
    } else if (proc.status) {
      card.appendChild(el("span", { class: "status-badge", text: proc.status }));
    } else {
      if (proc.summary) {
        card.appendChild(el("p", { class: "procedure-summary", text: proc.summary }));
      }
      if (proc.hasFaqLink && DATA.links.faq) {
        const a = el("a", {
          class: "external-link-btn",
          href: DATA.links.faq.url,
          target: "_blank",
          rel: "noopener",
          text: "よくあるご質問で見る"
        });
        card.appendChild(a);
      }
    }

    container.appendChild(card);
  });
}

/* ---------- 横断検索 ---------- */

function buildSearchIndex() {
  SEARCH_INDEX = [];
  DATA.marks.categories.forEach((cat) => {
    cat.items.forEach((item) => {
      SEARCH_INDEX.push({ categoryName: cat.name, item: item });
    });
  });
}

function matchesQuery(entry, q) {
  const item = entry.item;
  const fields = [item.mark, item.color || "", item.official || ""].concat(item.aliases || []);
  return fields.some((f) => f && f.toLowerCase().indexOf(q) !== -1);
}

function renderSearchResults(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  const resultsBox = document.getElementById("search-results");
  const menuBox = document.getElementById("home-menu");

  if (!q) {
    resultsBox.classList.add("hidden");
    menuBox.classList.remove("hidden");
    resultsBox.textContent = "";
    return;
  }

  menuBox.classList.add("hidden");
  resultsBox.classList.remove("hidden");
  resultsBox.textContent = "";

  const matches = SEARCH_INDEX.filter((entry) => matchesQuery(entry, q));

  if (matches.length === 0) {
    resultsBox.appendChild(el("p", { class: "search-empty", text: "「" + rawQuery + "」に一致する項目は見つかりませんでした" }));
    return;
  }

  matches.forEach((entry) => {
    const btn = el("button", { class: "search-result-btn", attrs: { type: "button" } });
    btn.appendChild(el("div", { class: "sr-category", text: entry.categoryName }));
    btn.appendChild(el("div", { class: "sr-mark", text: entry.item.mark }));
    btn.appendChild(el("div", { class: "sr-snippet", text: entry.item.official }));
    btn.addEventListener("click", () => openMarkDetail(entry.item));
    resultsBox.appendChild(btn);
  });
}

function openMarkDetail(item) {
  const container = document.getElementById("mark-detail-content");
  container.textContent = "";
  container.appendChild(buildMarkCard(item));
  navigateTo("mark-detail");
}

/* ---------- メモ・声の記録 ---------- */

function setupMemoForm() {
  const categorySelect = document.getElementById("memo-category");
  MEMO_CATEGORIES.forEach((c) => {
    categorySelect.appendChild(el("option", { text: c, attrs: { value: c } }));
  });

  const reactionSelect = document.getElementById("memo-reaction");
  MEMO_REACTIONS.forEach((r) => {
    reactionSelect.appendChild(el("option", { text: r, attrs: { value: r } }));
  });

  const shareGroup = document.getElementById("memo-share-group");
  MEMO_SHARE_OPTIONS.forEach((s, idx) => {
    const id = "memo-share-" + idx;
    const label = el("label", {}, []);
    const input = el("input", { attrs: { type: "radio", name: "memo-share", value: s, id: id } });
    if (idx === 0) input.checked = true;
    label.appendChild(input);
    label.appendChild(document.createTextNode(s));
    shareGroup.appendChild(label);
  });

  const textArea = document.getElementById("memo-text");
  const countLabel = document.getElementById("memo-text-count");
  textArea.addEventListener("input", () => {
    countLabel.textContent = String(textArea.value.length);
  });

  document.getElementById("memo-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    saveMemo();
  });

  document.getElementById("btn-export-csv").addEventListener("click", exportMemoCsv);
}

function applyPendingMemoPreset() {
  if (!pendingMemoPreset) return;
  const categorySelect = document.getElementById("memo-category");
  categorySelect.value = pendingMemoPreset;
  pendingMemoPreset = null;
}

function loadMemos() {
  try {
    const raw = localStorage.getItem(MEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMemos(list) {
  localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(list));
}

function saveMemo() {
  const category = document.getElementById("memo-category").value;
  const reaction = document.getElementById("memo-reaction").value;
  const text = document.getElementById("memo-text").value.trim();
  const shareInput = document.querySelector('input[name="memo-share"]:checked');
  const share = shareInput ? shareInput.value : MEMO_SHARE_OPTIONS[0];

  if (!text) return;

  const record = {
    id: Date.now(),
    category: category,
    reaction: reaction,
    text: text.slice(0, 100),
    share: share,
    createdAt: new Date().toISOString(),
    syncStatus: "local" // 将来のチーム集計連携のための拡張用フィールド
  };

  const list = loadMemos();
  list.unshift(record);
  saveMemos(list);

  document.getElementById("memo-form").reset();
  document.getElementById("memo-text-count").textContent = "0";
  renderMemoList();
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " +
    pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function renderMemoList() {
  const container = document.getElementById("memo-list");
  container.textContent = "";
  const list = loadMemos();

  if (list.length === 0) {
    container.appendChild(el("p", { class: "memo-empty", text: "まだ記録はありません" }));
    return;
  }

  list.forEach((rec) => {
    const item = el("div", { class: "memo-item" });
    const meta = el("div", { class: "memo-item-meta" });
    meta.appendChild(el("span", { text: rec.category }));
    meta.appendChild(el("span", { text: "反応：" + rec.reaction }));
    meta.appendChild(el("span", { text: rec.share }));
    meta.appendChild(el("span", { text: formatDateTime(rec.createdAt) }));
    item.appendChild(meta);
    item.appendChild(el("p", { class: "memo-item-text", text: rec.text }));
    container.appendChild(item);
  });
}

function csvEscape(value) {
  const s = String(value === undefined || value === null ? "" : value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportMemoCsv() {
  const list = loadMemos();
  const header = ["記録日時", "分類", "組合員の反応", "ひとこと", "共有範囲"];
  const rows = list.map((rec) => [
    formatDateTime(rec.createdAt),
    rec.category,
    rec.reaction,
    rec.text,
    rec.share
  ]);

  const csvLines = [header].concat(rows).map((row) => row.map(csvEscape).join(","));
  const csvContent = "﻿" + csvLines.join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const fileDate = today.getFullYear() + pad(today.getMonth() + 1) + pad(today.getDate());
  a.href = url;
  a.download = "配送ナビメモ_" + fileDate + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
