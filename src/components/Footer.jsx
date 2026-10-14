import { Mail, MessageCircle, Phone, Pin, Send } from 'lucide-react';

const SUPPORT_LINKS = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Terms & Conditions', href: '/terms-conditions' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Refund Policy', href: '/refund-policy' }
];

const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@xamtopprofficial', icon: MessageCircle },
  { label: 'Telegram', href: 'https://t.me/xamtopprnew', icon: Send },
  { label: 'WhatsApp Channel', href: 'https://whatsapp.com/channel/0029Vb5cQ6h3gvWYhr27j63a', icon: MessageCircle },
  { label: 'Instagram', href: 'http://instagram.com/xamtoppr', icon: MessageCircle },
  { label: 'Pinterest', href: 'https://in.pinterest.com/erdhirajsingh50', icon: Pin }
];

const DEFAULT_CONTACT = {
  supportHelpline: '+91 77177 07121',
  supportEmail: 'info@xamtoppr.com'
};

export default function Footer({
  supportHelpline = DEFAULT_CONTACT.supportHelpline,
  supportEmail = DEFAULT_CONTACT.supportEmail,
  className = ''
}) {
  const phoneHref = supportHelpline.replace(/[^\d+]/g, '');

  return (
    <footer className={`w-full border-t border-blue-950 bg-[#08152e] px-4 py-10 text-slate-300 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <a href="https://www.xamtoppr.com/" className="inline-flex rounded-lg bg-white px-1.5 py-1">
            <img
              src="/xamtoppr-logo.png"
              alt="XamToppr - learning for earning"
              className="h-12 w-auto"
              width="139"
              height="75"
              loading="lazy"
            />
          </a>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            Exam preparation books, study notes, and notification updates to help students learn, practice, and excel.
          </p>
          <h2 className="mt-5 text-xs font-extrabold uppercase tracking-wider text-white">Follow XamToppr</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow XamToppr on ${label}`}
                  title={label}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Support &amp; Legal</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {SUPPORT_LINKS.map(({ label, href }) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-11 items-center text-slate-400 transition hover:text-amber-300">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Contact Student Support</h2>
          <div className="mt-3 flex flex-col items-start gap-3 text-sm">
            <a href={`tel:${phoneHref}`} className="inline-flex min-h-11 items-center gap-2 text-slate-300 transition hover:text-amber-300">
              <Phone className="h-4 w-4 shrink-0 text-amber-400" />
              {supportHelpline}
            </a>
            <a href={`mailto:${supportEmail}`} className="inline-flex min-h-11 items-center gap-2 break-all text-slate-300 transition hover:text-amber-300">
              <Mail className="h-4 w-4 shrink-0 text-amber-400" />
              {supportEmail}
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-slate-700/70 pt-5 text-center text-xs text-slate-500">
        © 2026 XamToppr Edutech Private Limited. All Rights Reserved.
      </div>
    </footer>
  );
}
