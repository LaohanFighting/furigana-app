import type { Metadata } from 'next';
import './globals.css';

const APP_NAME = '日语假名标注工具';
const APP_DESC = '日语汉字自动标注平假名（振假名），标准 ruby 输出，可复制、可 SEO。支持支付宝/微信支付升级无限次。';
const CONTACT = '2410382485@qq.com';

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESC,
  keywords: ['日语', '振假名', 'furigana', '平假名', '汉字', 'ruby'],
  authors: [{ name: 'Furigana', url: process.env.NEXT_PUBLIC_APP_URL || 'https://furigana.example.com' }],
  openGraph: { title: APP_NAME, description: APP_DESC },
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
