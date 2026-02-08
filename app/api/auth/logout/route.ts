/**
 * POST /api/auth/logout
 * 清除 session cookie
 */

import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth-server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
