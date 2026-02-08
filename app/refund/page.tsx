import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Furigana 退款政策',
};

const CONTACT = '2410382485@qq.com';

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/" className="text-amber-600 hover:underline">← 首页</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-stone">
        <h1>Refund Policy（退款政策）</h1>
        <p>最后更新：2025年2月</p>
        <h2>1. 适用范围</h2>
        <p>本政策适用于通过本站进行的付费购买（如 Premium 升级）。支付由第三方支付渠道（如支付宝、微信支付）处理。</p>
        <h2>2. 退款条件</h2>
        <p>在以下情况下，您可申请退款：</p>
        <ul>
          <li>重复扣款或未获得对应服务（如支付成功但未开通 Premium）；</li>
          <li>在购买后 7 日内、且未大量使用付费权益的情况下，因个人原因申请退款（我们可酌情处理）。</li>
        </ul>
        <h2>3. 不适用退款</h2>
        <p>已正常开通并使用的付费权益，原则上不予退款。因违反服务条款导致账户受限或终止的，不退还已付费用。</p>
        <h2>4. 申请方式</h2>
        <p>请将订单号、支付凭证及原因发送至联系邮箱：<a href={`mailto:${CONTACT}`}>{CONTACT}</a>。我们将在合理期限内回复并处理。</p>
        <h2>5. 退款方式</h2>
        <p>退款将原路返回（支付宝/微信等），到账时间取决于支付渠道，通常为 1–10 个工作日。</p>
      </main>
    </div>
  );
}
