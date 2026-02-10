const express = require('express');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());

// 从环境变量读取虎皮椒的 APPID / KEY
const APPID = process.env.XUNHU_APPID;
const APPSECRET = process.env.XUNHU_APPSECRET;

// 签名函数（和 Vercel 项目里一样）
function signXunhu(params, secret) {
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'hash' && v !== undefined && v !== null && v !== '') {
      filtered[k] = String(v);
    }
  }
  const sortedKeys = Object.keys(filtered).sort();
  const signStr = sortedKeys.map(k => `${k}=${filtered[k]}`).join('&') + secret;
  return crypto.createHash('md5').update(signStr).digest('hex');
}

// 使用 Node.js 内置 https 模块发送请求（更可靠）
function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          text: async () => data,
          json: async () => JSON.parse(data),
        });
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 你的 Vercel 网站会 POST 到这里
app.post('/xunhu/create', async (req, res) => {
  try {
    const { trade_order_id, total_fee, title, notify_url, return_url, channel } = req.body || {};
    
    if (!APPID || !APPSECRET) {
      console.error('[proxy] Missing XUNHU_APPID or XUNHU_APPSECRET');
      return res.status(500).json({ 
        success: false, 
        error: 'Proxy server not configured. Set XUNHU_APPID and XUNHU_APPSECRET environment variables.' 
      });
    }

    if (!trade_order_id || !total_fee || !notify_url || !return_url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: trade_order_id, total_fee, notify_url, return_url' 
      });
    }

    const params = {
      version: '1.1',
      appid: APPID,
      trade_order_id,
      total_fee: String(total_fee),  // 确保是字符串，例如 "9.9"
      title: title || 'Furigana Premium',
      notify_url,
      return_url,
      type: channel === 'wechat' ? 'wechat' : 'alipay',
    };

    const hash = signXunhu(params, APPSECRET);
    params.hash = hash;

    // 转换为 form-data 格式
    const form = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => form.append(k, v));
    const formBody = form.toString();

    console.log('[proxy] Calling XunhuPay API:', {
      trade_order_id,
      total_fee,
      channel,
      notify_url,
    });

    // 使用 Node.js 内置 https 模块（更可靠）
    const resp = await httpsRequest('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formBody),
      },
      body: formBody,
    });

    // 获取响应文本
    const text = await resp.text();
    console.log('[proxy] XunhuPay response status:', resp.status);
    console.log('[proxy] XunhuPay response text (first 500 chars):', text.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[proxy] Failed to parse XunhuPay response as JSON:', e.message);
      console.error('[proxy] Full response text:', text);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to parse XunhuPay response: ' + e.message,
        rawResponse: text.substring(0, 200),
      });
    }
    
    if (!data) {
      console.error('[proxy] Failed to parse XunhuPay response');
      return res.status(500).json({ success: false, error: 'Failed to parse XunhuPay response' });
    }

    if (data.errcode !== 0 || !data.url) {
      console.error('[proxy] XunhuPay error:', data);
      return res.status(400).json({ 
        success: false, 
        error: data.errmsg || 'XunhuPay API error',
        errcode: data.errcode,
      });
    }

    console.log('[proxy] Success, payUrl generated for order:', trade_order_id);
    
    // 只返回支付链接给 Vercel
    return res.json({ 
      success: true, 
      payUrl: data.url,
      orderId: trade_order_id,
    });
  } catch (e) {
    console.error('[proxy] Error:', e);
    return res.status(500).json({ 
      success: false, 
      error: e.message || 'Proxy server error' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[proxy] XunhuPay proxy server listening on port ${PORT}`);
  console.log(`[proxy] Health check: http://localhost:${PORT}/health`);
  if (!APPID || !APPSECRET) {
    console.warn('[proxy] WARNING: XUNHU_APPID or XUNHU_APPSECRET not set!');
  }
});
