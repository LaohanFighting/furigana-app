import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Furigana 隐私政策',
};

const CONTACT = '2410382485@qq.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/" className="text-amber-600 hover:underline">← 首页</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-stone">
        <h1>Privacy Policy（隐私政策）</h1>
        <p>最后更新：2025年2月</p>
        <h2>1. 我们收集的信息</h2>
        <p>为提供登录与付费服务，我们收集：邮箱地址、验证码（临时）、支付相关订单号与状态。您输入的日文文本仅用于生成振假名，我们不会将其用于训练模型或向第三方提供。</p>
        <h2>2. 信息使用</h2>
        <p>上述信息用于：账户认证、用量统计与限制、支付与订单处理、法律义务履行及服务改进（如聚合统计）。</p>
        <h2>3. 共享与披露</h2>
        <p>我们不会出售您的个人信息。我们可能与支付服务商、邮件服务商共享实现服务所必需的数据；在法律要求或为保护权利时可能披露信息。</p>
        <h2>4. 数据安全与保留</h2>
        <p>我们采取合理技术与管理措施保护数据。验证码短期保留后删除；账户与订单数据在您使用期间及法律要求的期限内保留。</p>
        <h2>5. 您的权利</h2>
        <p>您有权查询、更正或删除个人数据（在合规前提下）。如需操作或撤回同意，请联系我们。</p>
        <h2>6. Cookie 与本地存储</h2>
        <p>我们使用 Cookie 维持登录状态（Session），不用于跨站追踪。</p>
        <h2>7. 未成年人</h2>
        <p>本服务不面向未满法定年龄用户主动收集信息；若发现此类数据将予以删除。</p>
        <h2>8. 变更与联系</h2>
        <p>我们可能更新本政策并公布于本页。如有疑问或请求，请联系：<a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      </main>
    </div>
  );
}
