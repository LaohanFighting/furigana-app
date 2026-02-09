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
    // 使用 @alicloud/pop-core（更稳定的 SDK）
    const RPCClient = (await import('@alicloud/pop-core')).default;

    const client = new RPCClient({
      accessKeyId,
      accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25',
    });

    // 发送短信
    const params = {
      PhoneNumbers: phone,
      SignName: signName,
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify({ code }),
    };

    const response = await client.request('SendSms', params, {
      method: 'POST',
    });

    if (response.Code === 'OK') {
      console.log('[sms] SMS sent successfully to', phone);
    } else {
      console.error('[sms] SMS send failed:', response.Message, 'Code:', response.Code);
      throw new Error(`SMS send failed: ${response.Message}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[sms] SMS error:', err.message, err);
    // 即使发送失败，也在日志中打印验证码，方便调试
    console.log('[dev] SMS code for', phone, ':', code);
    throw err;
  }
}
