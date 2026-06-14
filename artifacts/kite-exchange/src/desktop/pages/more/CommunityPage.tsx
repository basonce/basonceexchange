import { Send, MessageCircle, Youtube, Twitter, Globe, Hash, Mic, Calendar, Award, Users } from 'lucide-react';
import type { MorePageProps } from './types';
import { openAuthRegister } from './types';

const CHANNELS = [
  { icon: Send, name: 'Telegram', handle: '@BasonceGlobal', members: '2.4M members', color: '#229ED9' },
  { icon: Twitter, name: 'X (Twitter)', handle: '@Basonce', members: '5.1M followers', color: '#EAECEF' },
  { icon: MessageCircle, name: 'Discord', handle: 'discord.gg/basonce', members: '480K members', color: '#5865F2' },
  { icon: Youtube, name: 'YouTube', handle: 'Basonce', members: '1.2M subscribers', color: '#FF0000' },
  { icon: Hash, name: 'Reddit', handle: 'r/Basonce', members: '320K members', color: '#FF4500' },
  { icon: Globe, name: 'Instagram', handle: '@basonce', members: '890K followers', color: '#E1306C' },
];

const REGIONS = [
  { lang: 'English', members: '3.8M', flag: 'Global' },
  { lang: 'Español', members: '1.1M', flag: 'LatAm & Spain' },
  { lang: 'Português', members: '940K', flag: 'Brazil & Portugal' },
  { lang: '中文', members: '1.6M', flag: 'Chinese' },
  { lang: 'Türkçe', members: '720K', flag: 'Turkey' },
  { lang: 'Русский', members: '610K', flag: 'Russian' },
  { lang: 'Français', members: '430K', flag: 'France & Africa' },
  { lang: 'العربية', members: '380K', flag: 'MENA' },
  { lang: 'Bahasa', members: '560K', flag: 'Indonesia' },
];

const STATS = [
  { value: '18M+', label: 'Community members' },
  { value: '40+', label: 'Language groups' },
  { value: '600+', label: 'Active ambassadors' },
  { value: '120+', label: 'Events per year' },
];

const EVENTS = [
  { date: 'Jun 05, 2026', type: 'AMA', title: 'Live AMA with the Basonce derivatives product team', tag: 'Online' },
  { date: 'Jun 18, 2026', type: 'Meetup', title: 'Basonce community meetup — São Paulo', tag: 'In person' },
  { date: 'Jul 02, 2026', type: 'Webinar', title: 'Risk management masterclass for futures traders', tag: 'Online' },
  { date: 'Jul 24, 2026', type: 'Summit', title: 'Annual Basonce Builders Summit — Dubai', tag: 'In person' },
];

export default function CommunityPage({ onNavigate }: MorePageProps) {
  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans">
      {/* Hero */}
      <section className="relative pt-24 pb-20 border-b border-[#2B3139] overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-[#0ECB81]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-[600px] h-[400px] bg-[#F0B90B]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto px-6 text-center">
          <Globe className="w-12 h-12 text-[#F0B90B] mx-auto mb-6" />
          <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Join the global <span className="text-[#F0B90B]">Basonce community</span>
          </h1>
          <p className="text-lg text-[#B7BDC6] leading-relaxed max-w-2xl mx-auto mb-10">
            Eighteen million traders, builders and learners across more than forty languages. Connect, share strategies,
            get support and grow with people who speak your language — wherever you are in the world.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors">
              Join the community
            </button>
            <button onClick={() => onNavigate('academy')} className="px-8 py-4 bg-[#181A20] hover:bg-[#2B3139] border border-[#2B3139] text-white font-bold rounded-lg transition-colors">
              Explore Academy
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#181A20] border-b border-[#2B3139]">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x divide-[#2B3139]">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2 tabular-nums whitespace-nowrap">{s.value}</div>
                <div className="text-sm font-semibold text-[#848E9C] uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Channel grid */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Official channels</h2>
          <p className="text-[#848E9C] text-lg">Follow us where you spend your time. Beware of impersonators — these are our only official accounts.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CHANNELS.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-7 hover:border-[#F0B90B]/40 transition-colors">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-[#0B0E11] border border-[#2B3139] flex items-center justify-center">
                    <Icon className="w-6 h-6" style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{c.name}</h3>
                    <p className="text-sm text-[#848E9C] truncate">{c.handle}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#B7BDC6] tabular-nums whitespace-nowrap">{c.members}</span>
                  <button
                    onClick={openAuthRegister}
                    className="px-5 py-2 bg-[#0B0E11] hover:bg-[#2B3139] border border-[#2B3139] text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                  >
                    Join
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Regional communities */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Communities in your language</h2>
            <p className="text-[#848E9C] text-lg">Local groups moderated by native speakers across every major region.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REGIONS.map((r, i) => (
              <button
                key={i}
                onClick={openAuthRegister}
                className="text-left bg-[#0B0E11] border border-[#2B3139] rounded-xl p-5 flex items-center justify-between gap-3 hover:border-[#F0B90B]/40 transition-colors"
              >
                <div className="min-w-0">
                  <h3 className="font-bold text-white truncate">{r.lang}</h3>
                  <p className="text-sm text-[#848E9C] truncate">{r.flag}</p>
                </div>
                <span className="text-sm font-semibold text-[#F0B90B] tabular-nums whitespace-nowrap shrink-0">{r.members}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Ambassador program */}
      <section className="max-w-[1200px] mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Award className="w-10 h-10 text-[#F0B90B] mb-6" />
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Become a Basonce Ambassador</h2>
            <p className="text-[#B7BDC6] leading-relaxed mb-6">
              Our ambassadors are the heart of the community. They host meetups, translate content, mentor new traders and
              represent Basonce in their region. In return, they earn rewards, exclusive access and a direct line to our teams.
            </p>
            <ul className="space-y-3 mb-8">
              {['Exclusive rewards and event invitations', 'Early access to new products and features', 'Direct collaboration with the Basonce team', 'Leadership and public-speaking opportunities'].map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-[#B7BDC6]">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#F0B90B] shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors">
              Apply to the program
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, value: '600+', label: 'Ambassadors' },
              { icon: Globe, value: '90+', label: 'Countries' },
              { icon: Mic, value: '1,200+', label: 'Meetups hosted' },
              { icon: MessageCircle, value: '40+', label: 'Languages' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-[#181A20] border border-[#2B3139] rounded-2xl p-7 text-center">
                  <Icon className="w-7 h-7 text-[#F0B90B] mx-auto mb-4" />
                  <div className="text-2xl font-bold text-white tabular-nums">{s.value}</div>
                  <div className="text-sm text-[#848E9C] mt-1">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Events / AMAs */}
      <section className="bg-[#181A20] border-y border-[#2B3139] py-24">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="flex items-center gap-3 mb-12 justify-center">
            <Calendar className="w-7 h-7 text-[#F0B90B]" />
            <h2 className="text-3xl font-bold text-white tracking-tight">Upcoming events & AMAs</h2>
          </div>
          <div className="space-y-3">
            {EVENTS.map((e, i) => (
              <div key={i} className="bg-[#0B0E11] border border-[#2B3139] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 shrink-0 sm:w-56">
                  <span className="text-sm text-[#848E9C] tabular-nums whitespace-nowrap">{e.date}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] whitespace-nowrap">
                    {e.type}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-[#EAECEF] block truncate">{e.title}</span>
                </div>
                <span className="text-xs font-semibold text-[#B7BDC6] px-3 py-1 rounded-full bg-[#181A20] border border-[#2B3139] whitespace-nowrap shrink-0">
                  {e.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-[900px] mx-auto px-6 py-24">
        <div className="text-center bg-[#181A20] border border-[#2B3139] rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Your people are already here</h2>
          <p className="text-[#848E9C] mb-8 max-w-md mx-auto">
            Create your account, join the conversation and become part of one of the largest communities in crypto.
          </p>
          <button onClick={openAuthRegister} className="px-8 py-4 bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold rounded-lg transition-colors">
            Join Basonce
          </button>
        </div>
      </section>
    </div>
  );
}
