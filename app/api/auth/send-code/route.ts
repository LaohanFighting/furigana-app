/**
 * POST /api/auth/send-code
 * 请求体: { email?: string } 或 { phone?: string }
 * 向邮箱或手机发送 6 位验证码
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import { sendSms } from '@/lib/sms-aliyun';

const CODE_EXPIRE_MINUTES = 10;
const CODE_LENGTH = 6;

function generateCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

/** 规范化手机号：仅保留数字，至少 10 位 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');

    const byEmail = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const byPhone = phone.length >= 10;

    if (!byEmail && !byPhone) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or phone' },
        { status: 400 }
      );
    }
    if (byEmail && byPhone) {
      return NextResponse.json(
        { success: false, error: 'Provide either email or phone, not both' },
        { status: 400 }
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60 * 1000);

    if (byEmail) {
      const created = await prisma.verification.create({
        data: { email, code, expiresAt },
      });
      await prisma.verification.deleteMany({
        where: { email, id: { not: created.id } },
      });

      const resendKey = process.env.RESEND_API_KEY?.trim();
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = port === 465;

      if (resendKey) {
        // Resend API（走 HTTPS 443，适合腾讯云等限制 SMTP 端口的环境）
        const from = process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [email],
            subject: 'Your verification code - Furigana',
            html: `<p>Your verification code is: <strong>${code}</strong>.</p><p>It expires in ${CODE_EXPIRE_MINUTES} minutes.</p>`,
          }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Resend API ${res.status}: ${errBody}`);
        }
      } else if (host && user && pass) {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || user,
          to: email,
          subject: 'Your verification code - Furigana',
          text: `Your code is: ${code}. It expires in ${CODE_EXPIRE_MINUTES} minutes.`,
          html: `<p>Your verification code is: <strong>${code}</strong>.</p><p>It expires in ${CODE_EXPIRE_MINUTES} minutes.</p>`,
        });
      } else {
        if (host || user) {
          console.warn('[send-code] SMTP partially configured; missing:', !host ? 'SMTP_HOST' : !user ? 'SMTP_USER' : 'SMTP_PASS');
        }
        console.log('[dev] Verification code for', email, ':', code);
      }
    } else {
      const created = await prisma.verification.create({
        data: { phone, code, expiresAt },
      });
      await prisma.verification.deleteMany({
        where: { phone, id: { not: created.id } },
      });

      // 发送短信验证码（如果配置了阿里云短信服务）
      try {
        await sendSms({ phone, code });
      } catch (e) {
        // 发送失败时，验证码仍会记录在数据库中，用户可以从日志查看（开发模式）
        console.error('[send-code] SMS send failed, code logged:', code);
      }
    }

    // 开发模式：如果未配置 Resend/SMTP/短信，返回验证码供前端显示（仅开发环境）
    const isDev = process.env.NODE_ENV !== 'production';
    const resendConfigured = !!process.env.RESEND_API_KEY?.trim();
    const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    const smsConfigured = process.env.ALIYUN_ACCESS_KEY_ID && process.env.ALIYUN_ACCESS_KEY_SECRET && process.env.SMS_SIGN_NAME && process.env.SMS_TEMPLATE_CODE;
    
    return NextResponse.json({ 
      success: true,
      devCode: (isDev && !resendConfigured && !smtpConfigured && !smsConfigured) ? code : undefined
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('send-code error:', err.message, err);
    return NextResponse.json(
      { success: false, error: 'Failed to send code' },
      { status: 500 }
    );
  }
}
