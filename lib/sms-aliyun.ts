/**
 * 阿里云短信服务
 * 用于发送手机验证码
 */

interface SendSmsOptions {
  phone: string;
  code: string;
}

/**
 * 发送短信验证码
 * @param phone 手机号（11位数字，如 13800138000）
 * @param code 验证码（6位数字）
 */
export async function sendSms({ phone, code }: SendSmsOptions): Promise<void> {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.SMS_SIGN_NAME;
  const templateCode = process.env.SMS_TEMPLATE_CODE;

  // 如果未配置短信服务，只在日志中打印（开发/测试模式）
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    console.log('[dev] SMS not configured, code for', phone, ':', code);
    return;
  }

  try {
    // 动态导入阿里云 SDK（避免在未配置时增加 bundle 大小）
    const Dysmsapi20170525 = (await import('@alicloud/dysmsapi20170525')).default;
    const OpenApi = (await import('@alicloud/openapi-client')).default;
    const Util = (await import('@alicloud/tea-util')).default;

    // 创建客户端
    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret,
    });
    config.endpoint = 'dysmsapi.aliyuncs.com';
    const client = new Dysmsapi20170525(config);

    // 发送短信
    const sendSmsRequest = new Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName,
      templateCode,
      templateParam: JSON.stringify({ code }),
    });

    const runtime = new Util.RuntimeOptions({});
    const response = await client.sendSmsWithOptions(sendSmsRequest, runtime);

    if (response.body.code === 'OK') {
      console.log('[sms] SMS sent successfully to', phone);
    } else {
      console.error('[sms] SMS send failed:', response.body.message, 'Code:', response.body.code);
      throw new Error(`SMS send failed: ${response.body.message}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[sms] SMS error:', err.message, err);
    // 即使发送失败，也在日志中打印验证码，方便调试
    console.log('[dev] SMS code for', phone, ':', code);
    throw err;
  }
}
