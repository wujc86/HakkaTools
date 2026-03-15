import { HAKKA_DICT } from './data.js';

export function init() {
    const root = document.getElementById('pinyin-tool-root');
    let selectionMap = {};
    let SUPPLEMENT_DICT = {};
    let currentExcelData = null;
    let currentHeaders = [];

    const dialects = ["四縣", "海陸", "大埔", "饒平", "詔安", "南四縣"];
    const dialectColors = { "四縣": "#6c5ce7", "海陸": "#0984e3", "大埔": "#00b894", "饒平": "#e67e22", "詔安": "#d63031", "南四縣": "#00cec9" };

    // 內部的 render 函式
    const render = () => {
        const text = root.querySelector('#chineseInput').value.trim();
        const selected = Array.from(root.querySelectorAll('#dialectFilters input:checked')).map(i => i.value);
        const resultContainer = root.querySelector('#results');
        resultContainer.innerHTML = '';
        if (!text) return;

        selected.forEach(d => {
            const themeColor = dialectColors[d];
            if (!selectionMap[d]) selectionMap[d] = {};

            const block = document.createElement('div');
            block.className = 'dialect-block';
            block.innerHTML = `<div class="dialect-name" style="background:${themeColor}">${d}腔</div>`;
            
            const pool = document.createElement('div');
            pool.className = 'char-pool';

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const pinyins = getCombinedPinyins(char, d);
                
                const item = document.createElement('div');
                item.className = 'char-item';
                item.innerHTML = `<strong>${char}</strong><br><small>${pinyins[0]?.display || '?'}</small>`;
                pool.appendChild(item);
            }
            block.appendChild(pool);
            resultContainer.appendChild(block);
        });
    };

    const getCombinedPinyins = (char, dialect) => {
        const original = (HAKKA_DICT[char] && HAKKA_DICT[char][dialect]) ? HAKKA_DICT[char][dialect] : [];
        const supplement = (SUPPLEMENT_DICT[char] && SUPPLEMENT_DICT[char][dialect]) ? SUPPLEMENT_DICT[char][dialect] : [];
        let combined = original.map(p => ({ val: p, display: p }));
        supplement.forEach(p => {
            if (!original.includes(p)) combined.push({ val: p, display: `${p}(補)` });
        });
        return combined;
    };

    // 初始化事件監聽
    root.querySelector('#chineseInput').addEventListener('input', render);
    
    root.querySelector('#selectAllBtn').onclick = () => {
        root.querySelectorAll('#dialectFilters input').forEach(i => i.checked = true);
        render();
    };

    root.querySelector('#deselectAllBtn').onclick = () => {
        root.querySelectorAll('#dialectFilters input').forEach(i => i.checked = false);
        render();
    };

    // 動態產生腔調勾選框
    const filterContainer = root.querySelector('#dialectFilters');
    dialects.forEach(d => {
        const label = document.createElement('label');
        label.style.marginRight = "15px";
        label.innerHTML = `<input type="checkbox" checked value="${d}"> ${d}`;
        label.querySelector('input').onchange = render;
        filterContainer.appendChild(label);
    });

    // 綁定檔案上傳 (這部分邏輯與你原本的相似，但改用 root.querySelector 找元素)
    // ... (handleMainFile, handleRefFile 邏輯) ...

    console.log("拼音工具已就緒");
}