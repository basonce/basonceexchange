import { Newspaper, Download, Mail, FileText, Image as ImageIcon, Palette, ArrowUpRight } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const FEATURED_IN = ['Bloomberg', 'Reuters', 'CoinDesk', 'Forbes', 'The Block', 'Financial Times', 'TechCrunch', 'Cointelegraph'];

const RELEASES = [
  { date: 'May 14, 2026', tag: 'Company', title: 'Basonce surpasses 180 million registered users worldwide' },
  { date: 'Apr 02, 2026', tag: 'Product', title: 'Basonce launches regulated institutional custody across three new jurisdictions' },
  { date: 'Mar 18, 2026', tag: 'Security', title: 'Q1 Proof of Reserves attestation published with 1:1 backing verified on-chain' },
  { date: 'Feb 27, 2026', tag: 'Partnership', title: 'Basonce partners with leading payment networks to expand local fiat access' },
  { date: 'Jan 30, 2026', tag: 'Markets', title: 'Spot and futures volumes reach record highs in the first month of 2026' },
  { date: 'Dec 12, 2025', tag: 'Compliance', title: 'Basonce secures additional licensing across the European Economic Area' },
];

const MEDIA_KIT = [
  { icon: ImageIcon, title: 'Logo package', desc: 'Primary, secondary and monochrome logos in SVG and PNG formats.', size: 'SVG • PNG' },
  { icon: Palette, title: 'Brand guidelines', desc: 'Colors, typography, clear-space rules and approved usage guidance.', size: 'PDF • 4.2 MB' },
  { icon: FileText, title: 'Company fact sheet', desc: 'Key figures, leadership bios and our official boilerplate description.', size: 'PDF • 1.1 MB' },
  { icon: ImageIcon, title: 'Product screenshots', desc: 'High-resolution captures of the Basonce web and mobile experience.', size: 'ZIP • 18 MB' },
];

const BRAND_TILES = [
  { name: 'Basonce Gold', hex: '#F0B90B', text: '#000000' },
  { name: 'Carbon', hex: '#0B0E11', text: '#EAECEF' },
  { name: 'Slate', hex: '#181A20', text: '#EAECEF' },
  { name: 'Signal Green', hex: '#0ECB81', text: '#000000' },
];

export default function PressPage({ onNavigate }: MorePageProps) {
  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero */}
      <section className="relative pt-24 pb-20 border-b border-[#2B3139] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#F0B90B 1px, transparent 1px), linear-gradient(90deg, #F0B90B 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative max-w-[1200px] mx-auto px-6 text-center">
          <Newspaper className="w-12 h-12 text-[#F0B90B] mx-auto mb-6" />
          <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6">Newsroom</h1>
          <p className="text-lg text-[#B7BDC6] leading-relaxed max-w-2xl mx-auto mb-10">
            The latest announcements, company milestones and media resources from Basonce. For interviews and press inquiries,
            our communications team is here to help.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#media-kit" className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors">
              Download media kit
            </a>
            <a href="#contact" className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors">
              Contact press team
            </a>
          </div>
        </div>
      </section>

      {/* As featured in */}
      <section className="bg-[#181A20] border-b border-[#2B3139] py-12">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#848E9C] mb-8">As featured in</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {FEATURED_IN.map((name) => (
              <span key={name} className="text-lg lg:text-xl font-bold text-[#B7BDC6] tracking-tight whitespace-nowrap hover:text-white transition-colors">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Press releases */}
      <section className="max-w-[1100px] mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-10">Press releases</h2>
        <div className="divide-y divide-[#2B3139] border-y border-[#2B3139]">
          {RELEASES.map((r, i) => (
            <button
              key={i}
              onClick={openAuthRegister}
              className="w-full text-left py-6 flex flex-col sm:flex-row sm:items-center gap-3 group"
            >
              <div className="flex items-center gap-4 shrink-0 sm:w-64">
                <span className="text-sm text-[#848E9C] tabular-nums whitespace-nowrap">{r.date}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] whitespace-nowrap">
                  {r.tag}
                </span>
              </div>
              <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
                <span className="font-semibold text-[#EAECEF] group-hover:text-[#F0B90B] transition-colors truncate">{r.title}</span>
                <ArrowUpRight className="w-5 h-5 text-[#848E9C] group-hover:text-[#F0B90B] transition-colors shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Media kit */}
      <section id="media-kit" className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Media kit</h2>
            <p className="text-[#848E9C] text-lg">Everything you need to write about and represent Basonce accurately.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {MEDIA_KIT.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="bg-[#0B0E11] border border-[#2B3139] rounded-2xl p-7 flex items-start gap-5 hover:border-[#F0B90B]/40 transition-colors">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[#181A20] border border-[#2B3139] flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#F0B90B]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-bold text-white truncate">{m.title}</h3>
                      <span className="text-xs text-[#848E9C] whitespace-nowrap tabular-nums">{m.size}</span>
                    </div>
                    <p className="text-sm text-[#848E9C] leading-relaxed mb-4">{m.desc}</p>
                    <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#F0B90B] hover:text-[#FCD535] transition-colors">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Brand assets preview */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Brand colors</h2>
        <p className="text-[#848E9C] mb-12">Please use our official palette. Do not recolor or distort the Basonce wordmark.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {BRAND_TILES.map((t) => (
            <div key={t.name} className="rounded-2xl border border-[#2B3139] overflow-hidden">
              <div className="h-32 flex items-end p-5" style={{ backgroundColor: t.hex, color: t.text }}>
                <span className="text-2xl font-bold tracking-tight">Aa</span>
              </div>
              <div className="bg-[#181A20] p-5">
                <h3 className="font-bold text-white">{t.name}</h3>
                <p className="text-sm text-[#848E9C] font-mono mt-1">{t.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Press contact */}
      <section id="contact" className="bg-[#181A20] border-t border-[#2B3139] py-24">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="bg-[#0B0E11] border border-[#2B3139] rounded-3xl p-12 text-center">
            <Mail className="w-12 h-12 text-[#F0B90B] mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Press inquiries</h2>
            <p className="text-[#848E9C] mb-2 max-w-md mx-auto">
              Members of the media can reach our communications team for interviews, data requests and verification.
            </p>
            <p className="text-[#F0B90B] font-semibold mb-8">press@basonce.com</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors">
                Subscribe to updates
              </button>
              <button onClick={() => onNavigate('home')} className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors">
                Back to home
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
