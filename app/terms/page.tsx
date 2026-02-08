import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Furigana 服务条款',
};

const CONTACT = '2410382485@qq.com';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href="/" className="text-amber-600 hover:underline">← 首页</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-stone">
        <h1>Terms of Service（服务条款）</h1>
        <p>最后更新：2025年2月</p>
        <h2>1. 接受条款</h2>
        <p>使用本网站（「Furigana」、日语振假名标注服务）即表示您同意本服务条款。若不同意，请勿使用本服务。</p>
        <h2>2. 服务说明</h2>
        <p>本服务提供日文文本的振假名（平假名）自动标注功能，输出符合 HTML ruby 标准的可复制内容。免费用户受每日使用次数限制；付费用户可享受无限次或更高级功能。</p>
        <h2>3. 账户与安全</h2>
        <p>您需通过邮箱及验证码登录。您应妥善保管账户信息，对账户下发生的行为负责。</p>
        <h2>4. 付费与退款</h2>
        <p>付费订阅或一次性购买以本站及支付渠道展示为准。退款政策请参见<a href="/refund">《退款政策》</a>。</p>
        <h2>5. 禁止行为</h2>
        <p>禁止利用本服务进行违法、侵权、滥用（如爬虫、批量滥用接口等）行为。我们保留限制或终止违规账户的权利。</p>
        <h2>6. 免责</h2>
        <p>本服务「按原样」提供。我们不对振假名结果的绝对正确性、服务中断或数据丢失承担责任（在法律允许范围内）。</p>
        <h2>7. 变更</h2>
        <p>我们可能更新本条款，重大变更将在站内或通过注册邮箱通知。继续使用即视为接受新条款。</p>
        <h2>8. 联系</h2>
        <p>如有疑问，请联系：<a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      </main>
    </div>
  );
}
