/**
 * POST /api/auth/send-code
 * 请求体: { email: string }
 * 向邮箱发送 6 位验证码，用于登录/注册
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email' },
        { status: 400 }
      );
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRE_MINUTES * 60 * 1000);

    const created = await prisma.verification.create({
      data: { email, code, expiresAt },
    });
    await prisma.verification.deleteMany({
      where: { email, id: { not: created.id } },
    });

    const host = process.env.SMTP_HOST;
    if (host && process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Your verification code - Furigana',
        text: `Your code is: ${code}. It expires in ${CODE_EXPIRE_MINUTES} minutes.`,
        html: `<p>Your verification code is: <strong>${code}</strong>.</p><p>It expires in ${CODE_EXPIRE_MINUTES} minutes.</p>`,
      });
    } else {
      // 开发环境无 SMTP 时直接打日志
      console.log('[dev] Verification code for', email, ':', code);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('send-code error:', e);
    return NextResponse.json(
      { success: false, error: 'Failed to send code' },
      { status: 500 }
    );
  }
}
