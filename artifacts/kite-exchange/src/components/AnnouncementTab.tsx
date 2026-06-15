import { useState, useEffect } from 'react';
import { Bell, Gauge, Settings, Gift, Link, Smartphone, Shield, Building2, Users, Crown, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  icon_type: string;
  badge_color: string;
  is_pinned: boolean;
  read_count: number;
  created_at: string;
}

function getIcon(iconType: string, color: string) {
  const cls = `w-5 h-5`;
  const map: Record<string, JSX.Element> = {
    zap: <Gauge className={cls} />,
    settings: <Settings className={cls} />,
    trending: <Gauge className={cls} />,
    gift: <Gift className={cls} />,
    link: <Link className={cls} />,
    smartphone: <Smartphone className={cls} />,
    shield: <Shield className={cls} />,
    bank: <Building2 className={cls} />,
    users: <Users className={cls} />,
    crown: <Crown className={cls} />,
    copy: <Users className={cls} />,
    bell: <Bell className={cls} />,
  };
  return map[iconType] || <Bell className={cls} />;
}

function getBadgeConfig(type: string, color: string) {
  const colorMap: Record<string, { bg: string; text: string; accent: string }> = {
    green: { bg: 'bg-green-500/15', text: 'text-green-400', accent: '#0ECB81' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', accent: '#F97316' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', accent: '#3B82F6' },
    yellow: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', accent: '#F0B90B' },
    cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', accent: '#06B6D4' },
    red: { bg: 'bg-red-500/15', text: 'text-red-400', accent: '#EF4444' },
  };
  const typeLabel: Record<string, string> = {
    listing: 'New Listing',
    maintenance: 'Maintenance',
    feature: 'New Feature',
    airdrop: 'Airdrop',
    partnership: 'Partnership',
    promotion: 'Promotion',
  };
  return {
    ...(colorMap[color] || colorMap.blue),
    label: typeLabel[type] || 'Announcement',
  };
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReadCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function AnnouncementCard({ ann }: { ann: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getBadgeConfig(ann.announcement_type, ann.badge_color);

  return (
    <div className={`bg-[#1E2026] rounded-2xl border transition-all duration-200 overflow-hidden ${
      ann.is_pinned ? 'border-[#F0B90B]/30' : 'border-[#2B3139] hover:border-[#3B4149]'
    }`}>
      {ann.is_pinned && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F0B90B]/10 border-b border-[#F0B90B]/20">
          <Pin className="w-3 h-3 text-[#F0B90B]" />
          <span className="text-[#F0B90B] text-xs font-semibold">Pinned Announcement</span>
        </div>
      )}

      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
            {getIcon(ann.icon_type, ann.badge_color)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {cfg.label}
              </span>
              <span className="text-xs text-gray-500 ml-auto">{formatDate(ann.created_at)}</span>
            </div>

            <h3 className="font-bold text-white text-sm leading-snug mb-2">{ann.title}</h3>

            <p className={`text-xs text-gray-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {ann.content}
            </p>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Bell className="w-3 h-3" />
                <span>{formatReadCount(ann.read_count)} readers</span>
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${cfg.text}`}
              >
                {expanded ? (
                  <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Read more <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'listing', label: 'Listings' },
  { id: 'feature', label: 'Features' },
  { id: 'promotion', label: 'Promos' },
  { id: 'airdrop', label: 'Airdrops' },
  { id: 'maintenance', label: 'System' },
];

export default function AnnouncementTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) setAnnouncements(data);
    setLoading(false);
  };

  const filtered = filter === 'all' ? announcements : announcements.filter(a => a.announcement_type === filter);
  const pinned = filtered.filter(a => a.is_pinned);
  const rest = filtered.filter(a => !a.is_pinned);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 text-[#F0B90B]" />
          <h2 className="font-bold text-white text-base">Announcements</h2>
          <span className="ml-auto bg-[#F0B90B]/20 text-[#F0B90B] text-xs font-bold px-2 py-0.5 rounded-full">
            {announcements.length} Updates
          </span>
        </div>
        <p className="text-xs text-gray-500">Latest news, features, and system updates</p>
      </div>

      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {TYPE_FILTERS.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === t.id
                ? 'bg-[#F0B90B] text-black'
                : 'bg-[#2B3139] text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {pinned.map(ann => (
          <AnnouncementCard key={ann.id} ann={ann} />
        ))}

        {rest.length > 0 && pinned.length > 0 && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#2B3139]" />
            <span className="text-xs text-gray-600">Earlier</span>
            <div className="flex-1 h-px bg-[#2B3139]" />
          </div>
        )}

        {rest.map(ann => (
          <AnnouncementCard key={ann.id} ann={ann} />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No announcements in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
