import { Radio, Users } from 'lucide-react';

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
}

interface FeedLiveEmbedProps {
  data: LiveRoomData;
  onRoomClick?: () => void;
}

export default function FeedLiveEmbed({ data, onRoomClick }: FeedLiveEmbedProps) {
  if (!data || !data.messages) return null;

  return (
    <button
      onClick={onRoomClick}
      className="w-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] rounded-xl mb-3 overflow-hidden border border-[#2B3139] text-left hover:border-[#3B4149] transition-colors"
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="flex items-center gap-1 bg-[#F6465D] text-white text-[10px] font-bold px-2 py-1 rounded">
          <Radio className="w-3 h-3 animate-pulse" />
          LIVE
        </span>
        <div className="flex items-center gap-1 text-gray-300 text-xs">
          <Users className="w-3 h-3" />
          <span>{data.viewers}</span>
        </div>
      </div>

      <div className="flex justify-center py-3">
        <div className="relative">
          <img
            src={data.host_avatar}
            alt={data.host_name}
            className="w-16 h-16 rounded-full border-2 border-[#F0B90B] object-cover"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0ECB81] rounded-full border-2 border-[#1a1a2e]" />
        </div>
      </div>

      <div className="px-3 pb-3 space-y-1.5">
        {data.messages.slice(0, 3).map((msg, i) => (
          <div key={i} className="flex items-start gap-2">
            <img
              src={msg.avatar}
              alt={msg.name}
              className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 object-cover"
            />
            <div className="text-xs">
              <span className={`font-semibold mr-1 ${
                msg.role === 'host' ? 'text-[#F0B90B]' : 'text-[#0ECB81]'
              }`}>
                {msg.role === 'host' ? 'Host' : 'Co-host'}:
              </span>
              <span className="text-gray-300">{msg.text}</span>
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}
