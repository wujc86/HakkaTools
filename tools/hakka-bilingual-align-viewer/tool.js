(() => {
  const BATCH_SIZE = 50;

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

  const elements = {
    jsonFileInput: document.getElementById("jsonFileInput"),
    btnLoadDefaultData: document.getElementById("btnLoadDefaultData"),
    currentDataSource: document.getElementById("currentDataSource"),
    searchInput: document.getElementById("searchInput"),
    statusMsg: document.getElementById("statusMsg"),
    resultsArea: document.getElementById("resultsArea"),
    loadMoreArea: document.getElementById("loadMoreArea"),
    btnLoadMore: document.getElementById("btnLoadMore"),
    checkboxes: Array.from(document.querySelectorAll(".dialect-cb")),
  };

  function init() {
    bindEvents();
  }

  function bindEvents() {
    elements.jsonFileInput.addEventListener("change", handleFileInputChange);
    elements.btnLoadDefaultData.addEventListener("click", loadDefaultData);
    elements.searchInput.addEventListener("input", filterData);
    elements.checkboxes.forEach((cb) => cb.addEventListener("change", filterData));
    elements.btnLoadMore.addEventListener("click", renderNextBatch);

    elements.resultsArea.addEventListener("mouseover", handleTokenHover);
    elements.resultsArea.addEventListener("mouseout", handleTokenLeave);
  }

  async function loadDefaultData() {
    setStatus("正在載入預設資料...");
    try {
      const response = await fetch("./data.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      loadDataSuccess(data, "預設 data.json");
    } catch (error) {
      console.warn("預設資料載入失敗：", error);
      setStatus("找不到預設資料，請改用手動上傳 JSON");
      elements.currentDataSource.textContent = "尚未載入預設資料";
    }
  }

  function handleFileInputChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        loadDataSuccess(json, `手動上傳：${file.name}`);
      } catch (error) {
        alert("JSON 格式錯誤，請確認檔案內容是否正確。");
        console.error(error);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function loadDataSuccess(data, sourceLabel) {
    if (!Array.isArray(data)) {
      alert("資料格式錯誤：根層必須是陣列。");
      return;
    }

    allData = data;
    filteredData = [];
    currentRenderedCount = 0;

    elements.searchInput.disabled = false;
    elements.currentDataSource.textContent = sourceLabel;
    setStatus(`資料載入完成，共 ${allData.length} 筆資料`);
    filterData();
  }

  function setStatus(message) {
    elements.statusMsg.textContent = message;
  }

  function getActiveDialects() {
    return elements.checkboxes
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function filterData() {
    if (!Array.isArray(allData) || allData.length === 0) {
      elements.resultsArea.innerHTML = `<div class="empty-state">請先載入資料</div>`;
      elements.loadMoreArea.classList.add("d-none");
      return;
    }

    const keyword = elements.searchInput.value.trim().toLowerCase();
    const activeDialects = getActiveDialects();

    filteredData = allData.filter((item) => {
      const dialect = (item?.dialect || "").trim();
      const matchesDialect = activeDialects.some((activeDialect) =>
        dialect.includes(activeDialect)
      );

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

      return (
        rawHk.includes(keyword) ||
        rawCn.includes(keyword) ||
        headword.includes(keyword)
      );
    });

    if (keyword) {
      setStatus(`搜尋「${keyword}」：找到 ${filteredData.length} 筆`);
    } else {
      setStatus(`顯示全部：共 ${filteredData.length} 筆`);
    }

    elements.resultsArea.innerHTML = "";
    currentRenderedCount = 0;
    renderNextBatch();
  }

  function renderNextBatch() {
    if (filteredData.length === 0) {
      elements.resultsArea.innerHTML = `<div class="empty-state">沒有符合的資料</div>`;
      elements.loadMoreArea.classList.add("d-none");
      return;
    }

    const end = Math.min(currentRenderedCount + BATCH_SIZE, filteredData.length);
    const fragment = document.createDocumentFragment();

    for (let i = currentRenderedCount; i < end; i += 1) {
      const item = filteredData[i];
      fragment.appendChild(createResultCard(item));
    }

    elements.resultsArea.appendChild(fragment);
    currentRenderedCount = end;

    if (currentRenderedCount < filteredData.length) {
      elements.loadMoreArea.classList.remove("d-none");
      elements.btnLoadMore.textContent = `顯示更多（剩餘 ${filteredData.length - currentRenderedCount} 筆）`;
    } else {
      elements.loadMoreArea.classList.add("d-none");
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
    const dialectColorClass = dialectColors[dialect] || "bg-secondary";

    card.dataset.uid = uid;
    card.dataset.alignment = JSON.stringify(alignment);

    const hkHtml = safeArray(item?.tokens_hk)
      .map((token) => {
        const id = token?.id;
        const text = escapeHtml(String(token?.text || ""));
        return `
          <span
            id="${uid}-hk-${id}"
            class="token hk-token"
            data-uid="${uid}"
            data-lang="hk"
            data-token-id="${id}"
          >${text}</span>
        `;
      })
      .join("");

    const cnHtml = safeArray(item?.tokens_cn)
      .map((token) => {
        const id = token?.id;
        const text = escapeHtml(String(token?.text || ""));
        return `
          <span
            id="${uid}-cn-${id}"
            class="token cn-token"
            data-uid="${uid}"
            data-lang="cn"
            data-token-id="${id}"
          >${text}</span>
        `;
      })
      .join("");

    let pinyinHtml = "";
    if (pinyinVal) {
      pinyinHtml += `<span class="pinyin-badge">調值：${escapeHtml(pinyinVal)}</span>`;
    }
    if (pinyinType) {
      pinyinHtml += `<span class="pinyin-badge">調型：${escapeHtml(pinyinType)}</span>`;
    }

    card.innerHTML = `
      <div class="card-meta-header">
        <span class="dialect-badge ${dialectColorClass}">${escapeHtml(dialect || "未標示")}</span>
        <strong class="fs-5 text-dark">${escapeHtml(headword)}</strong>
        <div class="ms-auto d-flex align-items-center flex-wrap gap-1">
          ${pinyinHtml}
          <small class="text-muted opacity-50">#${escapeHtml(uid)}</small>
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
      alignment
        .filter((pair) => Number(pair.hk_id) === tokenId)
        .forEach((pair) => {
          const target = document.getElementById(`${uid}-cn-${pair.cn_id}`);
          if (target) target.classList.add("active");
        });
    } else if (lang === "cn") {
      alignment
        .filter((pair) => Number(pair.cn_id) === tokenId)
        .forEach((pair) => {
          const target = document.getElementById(`${uid}-hk-${pair.hk_id}`);
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

    const uid = token.dataset.uid;
    clearHighlight(uid);
  }

  function clearHighlight(uid) {
    const card = elements.resultsArea.querySelector(`.result-card[data-uid="${cssEscape(uid)}"]`);
    if (!card) return;

    card.querySelectorAll(".token.active").forEach((el) => {
      el.classList.remove("active");
    });
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

  init();
})();
