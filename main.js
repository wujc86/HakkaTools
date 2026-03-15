/**
 * 功能：動態載入指定的工具
 * @param {string} toolName 工具資料夾的名稱 (例如 'pinyin-tool')
 */
async function loadTool(toolName) {
    const container = document.getElementById('tool-container');
    
    // 0. 更新 UI 狀態 (按鈕 active 樣式)
    updateActiveNavItem(toolName);

    // 顯示載入中...
    container.innerHTML = '<div class="loading">正在載入工具...</div>';

    try {
        // 1. 同時載入 HTML 片段與 CSS
        const htmlPath = `tools/${toolName}/tool.html`;
        const cssPath = `tools/${toolName}/tool.css`;
        const jsPath = `./tools/${toolName}/tool.js`;

        const [htmlResponse] = await Promise.all([
            fetch(htmlPath),
            injectCSS(toolName, cssPath)
        ]);

        if (!htmlResponse.ok) throw new Error('找不到工具檔案');
        
        const htmlContent = await htmlResponse.text();

        // 2. 將 HTML 注入容器
        container.innerHTML = htmlContent;

        // 3. 動態載入 JS 模組並執行 init 函式
        // 加上時間戳記避免快取 (Cache-busting)
        const module = await import(`${jsPath}?t=${new Date().getTime()}`);
        
        if (module.init) {
            module.init();
        } else {
            console.warn(`工具 ${toolName} 未定義 init() 函式`);
        }

    } catch (error) {
        console.error('載入失敗:', error);
        container.innerHTML = `
            <div style="color:red; padding:20px; border:1px dashed red; border-radius:8px;">
                <h3>⚠️ 載入失敗</h3>
                <p>${error.message}</p>
                <p>請確認 tools/${toolName}/ 目錄下有 tool.html, tool.js, tool.css</p>
            </div>`;
    }
}

/**
 * 動態注入 CSS 檔案
 */
function injectCSS(id, href) {
    return new Promise((resolve) => {
        const cssId = `css-${id}`;
        if (document.getElementById(cssId)) {
            resolve(); // 已經載入過了
            return;
        }
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => {
            console.warn(`樣式表載入失敗: ${href}`);
            resolve(); // 樣式失敗仍繼續執行 JS
        };
        document.head.appendChild(link);
    });
}

/**
 * 更新導航列按鈕樣式
 */
function updateActiveNavItem(toolName) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick')?.includes(toolName)) {
            btn.classList.add('active');
        }
    });
}