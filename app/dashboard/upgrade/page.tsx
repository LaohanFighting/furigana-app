'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 升级无限次功能已取消，直接重定向到标注工具
 */
export default function UpgradePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center text-stone-500">
      正在跳转到标注工具…
    </div>
  );
}
