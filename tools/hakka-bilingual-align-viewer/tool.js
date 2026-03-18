const BATCH_SIZE = 50;
const DATA_PATH = "./tools/hakka-bilingual-align-viewer/客語辭典_對齊結果_完整資訊.json";

const dialectColors = {
  四縣: "bg-sixian",
  海陸: "bg-hailu",
  大埔: "bg-dapu",
  饒平: "bg-raoping",
  詔安: "bg-zhaoan",
  南四縣: "bg-nansi",
};

let allData = [];
let filteredData = [];
let currentRenderedCount = 0;
let root = null;

export function init() {
  root = document.querySelector(".hakka-align-tool");
  if (!root) return;

  bindEvents();
  loadFixedData();
}

function bindEvents() {
  const searchInput = root.querySelector("#searchInput");
  const btnLoadMore = root.querySelector("#btnLoadMore");
  const resultsArea = root.querySelector("#resultsArea");

  searchInput?.addEventListener("input", filterData);
  btnLoadMore?.addEventListener("click", renderNextBatch);

  root.querySelectorAll(".dialect-cb").forEach((cb) => {
    cb.addEventListener("change", filterData);
  });

  resultsArea?.addEventListener("mouseover", handleTokenHover);
  resultsArea?.addEventListener("mouseout", handleTokenLeave);
}

async function loadFixedData() {
  setStatus("正在載入資料...");

  try {
    const response = await fetch(`${DATA_PATH}?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    loadDataSuccess(data);
  } catch (error) {
    console.error("固定資料載入失敗：", error);
    setStatus("資料載入失敗，請確認 JSON 檔案路徑是否正確。");
    root.querySelector("#resultsArea").innerHTML = `
      <div class="empty-state">
        無法載入資料檔：客語辭典例句對應結果.json
      </div>
    `;
  }
}

function loadDataSuccess(data) {
  if (!Array.isArray(data)) {
    setStatus("資料格式錯誤：根層必須是陣列。");
    root.querySelector("#resultsArea").innerHTML = `
      <div class="empty-state">
        JSON 格式錯誤：根層必須是陣列
      </div>
    `;
    return;
  }

  allData = data;
  filteredData = [];
  currentRenderedCount = 0;

  root.querySelector("#searchInput").disabled = false;
  setStatus(`資料載入完成，共 ${allData.length} 筆資料`);

  filterData();
}

function setStatus(message) {
  root.querySelector("#statusMsg").textContent = message;
}

function getActiveDialects() {
  return Array.from(root.querySelectorAll(".dialect-cb"))
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function filterData() {
  const resultsArea = root.querySelector("#resultsArea");
  const loadMoreArea = root.querySelector("#loadMoreArea");

  if (!Array.isArray(allData) || allData.length === 0) {
    resultsArea.innerHTML = `<div class="empty-state">目前沒有資料</div>`;
    loadMoreArea.classList.add("hidden");
    return;
  }

  const keyword = root.querySelector("#searchInput").value.trim().toLowerCase();
  const activeDialects = getActiveDialects();

  filteredData = allData.filter((item) => {
    const dialect = String(item?.dialect || "").trim();
    const matchesDialect = activeDialects.some((d) => dialect.includes(d));
    if (!matchesDialect) return false;

    if (!keyword) return true;

    const rawHk = safeArray(item?.tokens_hk)
      .map((t) => String(t?.text || ""))
      .join("")
      .toLowerCase();

    const rawCn = safeArray(item?.tokens_cn)
      .map((t) => String(t?.text || ""))
      .join("")
      .toLowerCase();

    const headword = String(item?.metadata?.headword || "").toLowerCase();

    return rawHk.includes(keyword) || rawCn.includes(keyword) || headword.includes(keyword);
  });

  if (keyword) {
    setStatus(`搜尋「${keyword}」：找到 ${filteredData.length} 筆`);
  } else {
    setStatus(`顯示全部：共 ${filteredData.length} 筆`);
  }

  resultsArea.innerHTML = "";
  currentRenderedCount = 0;
  renderNextBatch();
}

function renderNextBatch() {
  const resultsArea = root.querySelector("#resultsArea");
  const loadMoreArea = root.querySelector("#loadMoreArea");
  const btnLoadMore = root.querySelector("#btnLoadMore");

  if (filteredData.length === 0) {
    resultsArea.innerHTML = `<div class="empty-state">沒有符合的資料</div>`;
    loadMoreArea.classList.add("hidden");
    return;
  }

  const end = Math.min(currentRenderedCount + BATCH_SIZE, filteredData.length);
  const fragment = document.createDocumentFragment();

  for (let i = currentRenderedCount; i < end; i++) {
    fragment.appendChild(createResultCard(filteredData[i]));
  }

  resultsArea.appendChild(fragment);
  currentRenderedCount = end;

  if (currentRenderedCount < filteredData.length) {
    loadMoreArea.classList.remove("hidden");
    btnLoadMore.textContent = `顯示更多（剩餘 ${filteredData.length - currentRenderedCount} 筆）`;
  } else {
    loadMoreArea.classList.add("hidden");
  }
}

function createResultCard(item) {
  const card = document.createElement("article");
  card.className = "result-card";

  const alignment = safeArray(item?.alignment);
  const uid = String(item?.uid || `item-${Math.random().toString(36).slice(2)}`);
  const dialect = String(item?.dialect || "").trim();
  const headword = String(item?.metadata?.headword || "無詞目");
  const pinyinVal = String(item?.metadata?.pinyin_value || "");
  const pinyinType = String(item?.metadata?.pinyin_type || "");
  const dialectColorClass = dialectColors[dialect] || "";

  card.dataset.uid = uid;
  card.dataset.alignment = JSON.stringify(alignment);

  const hkHtml = safeArray(item?.tokens_hk).map((token) => `
    <span
      id="${uid}-hk-${token?.id}"
      class="token hk-token"
      data-uid="${uid}"
      data-lang="hk"
      data-token-id="${token?.id}"
    >${escapeHtml(String(token?.text || ""))}</span>
  `).join("");

  const cnHtml = safeArray(item?.tokens_cn).map((token) => `
    <span
      id="${uid}-cn-${token?.id}"
      class="token cn-token"
      data-uid="${uid}"
      data-lang="cn"
      data-token-id="${token?.id}"
    >${escapeHtml(String(token?.text || ""))}</span>
  `).join("");

  let pinyinHtml = "";
  if (pinyinVal) pinyinHtml += `<span class="pinyin-badge">調值：${escapeHtml(pinyinVal)}</span>`;
  if (pinyinType) pinyinHtml += `<span class="pinyin-badge">調型：${escapeHtml(pinyinType)}</span>`;

  card.innerHTML = `
    <div class="card-meta-header">
      <span class="dialect-badge ${dialectColorClass}">${escapeHtml(dialect || "未標示")}</span>
      <strong>${escapeHtml(headword)}</strong>
      <div style="margin-left:auto; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        ${pinyinHtml}
        <small style="color:#999;">#${escapeHtml(uid)}</small>
      </div>
    </div>
    <div class="card-body-custom">
      <div class="sent-row">
        <div class="sent-label">客語</div>
        <div class="sent-content">${hkHtml}</div>
      </div>
      <div class="sent-row">
        <div class="sent-label">華語</div>
        <div class="sent-content">${cnHtml}</div>
      </div>
    </div>
  `;

  return card;
}

function handleTokenHover(event) {
  const token = event.target.closest(".token");
  if (!token) return;

  const uid = token.dataset.uid;
  const lang = token.dataset.lang;
  const tokenId = Number(token.dataset.tokenId);

  clearHighlight(uid);
  token.classList.add("active");

  const card = token.closest(".result-card");
  if (!card) return;

  const alignment = parseAlignment(card.dataset.alignment);

  if (lang === "hk") {
    alignment.filter((pair) => Number(pair.hk_id) === tokenId).forEach((pair) => {
      const target = root.querySelector(`#${cssEscape(`${uid}-cn-${pair.cn_id}`)}`);
      if (target) target.classList.add("active");
    });
  } else {
    alignment.filter((pair) => Number(pair.cn_id) === tokenId).forEach((pair) => {
      const target = root.querySelector(`#${cssEscape(`${uid}-hk-${pair.hk_id}`)}`);
      if (target) target.classList.add("active");
    });
  }
}

function handleTokenLeave(event) {
  const token = event.target.closest(".token");
  if (!token) return;

  const relatedTarget = event.relatedTarget;
  if (relatedTarget && token.closest(".result-card")?.contains(relatedTarget)) {
    return;
  }

  clearHighlight(token.dataset.uid);
}

function clearHighlight(uid) {
  const card = root.querySelector(`.result-card[data-uid="${uid}"]`);
  if (!card) return;
  card.querySelectorAll(".token.active").forEach((el) => el.classList.remove("active"));
}

function parseAlignment(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value).replace(/"/g, '\\"');
}
