/**
 * 密码加密与验证工具
 * 使用 bcryptjs（纯 JS，无需 native 编译）
 */

import bcrypt from 'bcryptjs';

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码（hash）
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 加密后的密码（hash）
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
