import { Radio, Users } from 'lucide-react';
import AnimatedLiveAvatar, { AVATAR_COLOR_THEMES } from '../AnimatedLiveAvatar';

interface LiveMessage {
  role: string;
  name: string;
  text: string;
  avatar: string;
}

interface LiveRoomData {
  title: string;
  viewers: number;
  host_name: string;
  host_avatar: string;
  coin: string;
  messages: LiveMessage[];
  theme_index?: number;
  action_label?: string;
  action_type?: string;
  pnl?: string;
}

interface FeedLiveEmbedProps {
  data: LiveRoomData;
  onRoomClick?: () => void;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function FeedLiveEmbed({ data, onRoomClick }: FeedLiveEmbedProps) {
  if (!data || !data.messages) return null;

  const themeIdx = data.theme_index !== undefined
    ? data.theme_index
    : hashStr(data.host_name || 'user') % AVATAR_COLOR_THEMES.length;

  const theme = AVATAR_COLOR_THEMES[themeIdx % AVATAR_COLOR_THEMES.length];

  const isPositive = data.pnl ? !data.pnl.startsWith('-') : true;
  const actionType = data.action_type || 'Opening Long';
  const isShort = actionType.toLowerCase().includes('short');

  return (
    <button
      onClick={onRoomClick}
      className="w-full rounded-xl mb-3 overflow-hidden text-left hover:opacity-95 transition-opacity active:scale-[0.99]"
      style={{
        background: 'linear-gradient(135deg, #0f1117 0%, #141720 50%, #0f1117 100%)',
        border: '1px solid #2B3139',
      }}
    >
      <div
        className="px-3 pt-3 pb-2 flex items-center gap-2.5"
        style={{ borderBottom: '1px solid #1e2230' }}
      >
        <AnimatedLiveAvatar
          src={data.host_avatar}
          alt={data.host_name}
          size={44}
          themeIndex={themeIdx}
          showLive={true}
          isLive={true}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-black text-sm truncate">{data.host_name}</span>
          </div>
          <p className="text-gray-400 text-[11px] font-semibold truncate">{data.title || 'TRADING FUTURES LIVE'}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: '#F6465D22', border: '1px solid #F6465D44' }}
          >
            <Radio className="w-3 h-3 text-[#F6465D] animate-pulse" />
            <span className="text-[#F6465D] text-[10px] font-black">LIVE</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-[10px]">
            <Users className="w-3 h-3" />
            <span className="font-semibold">{typeof data.viewers === 'number' ? data.viewers.toLocaleString() : data.viewers}</span>
          </div>
        </div>
      </div>

      <div
        className="mx-3 my-2.5 rounded-xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #0d1020 0%, #131625 100%)',
          border: `1px solid ${theme.border}22`,
          minHeight: 90,
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at 70% 50%, ${theme.ring1}44 0%, transparent 70%)`,
          }}
        />
        <div className="relative flex items-center justify-center py-3">
          <AnimatedLiveAvatar
            src={data.host_avatar}
            alt={data.host_name}
            size={62}
            themeIndex={themeIdx}
            showLive={false}
            isLive={true}
          />
        </div>

        <div className="relative px-3 pb-3 space-y-1.5">
          {data.messages.slice(0, 3).map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <img
                src={msg.avatar}
                alt={msg.name}
                className="w-4 h-4 rounded-full flex-shrink-0 object-cover"
              />
              <p className="text-[11px] text-gray-300 truncate">
                <span className="font-bold text-gray-100">{msg.name}:</span>{' '}
                {msg.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mx-3 mb-3 px-3 py-2 rounded-xl flex items-center justify-between"
        style={{ background: '#1a1d26', border: '1px solid #2B3139' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm">{data.coin}USDT</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#2B3139', color: '#848E9C' }}
          >
            Perp
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: isShort ? '#F6465D22' : '#0ECB8122',
              color: isShort ? '#F6465D' : '#0ECB81',
              border: `1px solid ${isShort ? '#F6465D44' : '#0ECB8144'}`,
            }}
          >
            {actionType}
          </span>
        </div>
        {data.pnl && (
          <span
            className="font-black text-sm"
            style={{ color: isPositive ? '#0ECB81' : '#F6465D' }}
          >
            {isPositive && '+'}{data.pnl} USDT
          </span>
        )}
      </div>
    </button>
  );
}
