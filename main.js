let currentToolName = null;

/**
 * 功能：動態載入指定的工具
 * @param {string} toolName 工具資料夾名稱（例如 'pinyin-tool'）
 */
async function loadTool(toolName) {
    const container = document.getElementById("tool-container");
    const version = Date.now();

    updateActiveNavItem(toolName);
    container.innerHTML = '<div class="loading">正在載入工具...</div>';

    try {
        // 先清掉上一個工具的樣式，避免 CSS 污染
        removePreviousToolCSS(toolName);

        const htmlPath = `tools/${toolName}/tool.html?v=${version}`;
        const cssPath = `tools/${toolName}/tool.css?v=${version}`;
        const jsPath = `./tools/${toolName}/tool.js?v=${version}`;

        const [htmlResponse] = await Promise.all([
            fetch(htmlPath, { cache: "no-store" }),
            injectCSS(toolName, cssPath)
        ]);

        if (!htmlResponse.ok) {
            throw new Error("找不到工具檔案");
        }

        const htmlContent = await htmlResponse.text();

        // 注入 HTML 片段
        container.innerHTML = htmlContent;

        // 動態載入 JS 模組
        const module = await import(jsPath);

        if (module && typeof module.init === "function") {
            module.init({
                toolName,
                container
            });
        } else {
            console.warn(`工具 ${toolName} 未定義 init() 函式`);
        }

        currentToolName = toolName;

    } catch (error) {
        console.error("載入失敗:", error);
        container.innerHTML = `
            <div style="color:red; padding:20px; border:1px dashed red; border-radius:8px;">
                <h3>⚠️ 載入失敗</h3>
                <p>${error.message}</p>
                <p>請確認 tools/${toolName}/ 目錄下有 tool.html、tool.js、tool.css</p>
            </div>
        `;
    }
}

/**
 * 動態注入目前工具的 CSS
 */
function injectCSS(toolName, href) {
    return new Promise((resolve) => {
        const cssId = `css-${toolName}`;
        const existing = document.getElementById(cssId);

        if (existing) {
            existing.href = href;
            resolve();
            return;
        }

        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => {
            console.warn(`樣式表載入失敗: ${href}`);
            resolve();
        };

        document.head.appendChild(link);
    });
}

/**
 * 清除非當前工具的 tool.css，避免工具樣式互相污染
 */
function removePreviousToolCSS(nextToolName) {
    document.querySelectorAll('link[id^="css-"]').forEach((link) => {
        if (link.id !== `css-${nextToolName}`) {
            link.remove();
        }
    });
}

/**
 * 更新導航列按鈕樣式
 */
function updateActiveNavItem(toolName) {
    document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.remove("active");
        if (btn.getAttribute("onclick")?.includes(toolName)) {
            btn.classList.add("active");
        }
    });
}
