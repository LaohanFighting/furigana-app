/**
 * 生成激活码脚本
 * 用法：
 *   npx tsx scripts/generate-activation-code.ts [数量] [过期天数]
 * 示例：
 *   npx tsx scripts/generate-activation-code.ts 10 30
 *   生成10个激活码，30天后过期
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateCode(): string {
  const prefix = 'FURIGANA';
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${part1}-${part2}`;
}

async function main() {
  const count = parseInt(process.argv[2] || '1', 10);
  const expireDays = parseInt(process.argv[3] || '0', 10);

  if (count < 1 || count > 100) {
    console.error('数量必须在 1-100 之间');
    process.exit(1);
  }

  const expiresAt = expireDays > 0
    ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000)
    : null;

  console.log(`正在生成 ${count} 个激活码${expiresAt ? `（${expireDays}天后过期）` : '（永不过期）'}...\n`);

  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code: string = '';
    let exists = true;

    // 确保激活码唯一
    while (exists) {
      code = generateCode();
      const existing = await prisma.activationCode.findUnique({
        where: { code },
      });
      exists = !!existing;
    }

    await prisma.activationCode.create({
      data: {
        code,
        expiresAt,
      },
    });

    codes.push(code);
    console.log(`${i + 1}. ${code}`);
  }

  console.log(`\n✅ 成功生成 ${count} 个激活码！`);
  console.log('\n激活码列表（可复制）：');
  console.log('---');
  codes.forEach((code) => console.log(code));
  console.log('---');
}

main()
  .catch((e) => {
    console.error('生成失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
