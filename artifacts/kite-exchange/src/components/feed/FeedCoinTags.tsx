interface CoinTag {
  symbol: string;
  change: number;
}

interface FeedCoinTagsProps {
  tags: CoinTag[];
  onTagClick?: (symbol: string) => void;
}

export default function FeedCoinTags({ tags, onTagClick }: FeedCoinTagsProps) {
  if (!tags || tags.length === 0) return null;

  const handleClick = (symbol: string) => {
    if (onTagClick) {
      onTagClick(symbol);
      return;
    }
    window.dispatchEvent(new CustomEvent('navigate-to-trade', {
      detail: { symbol: `${symbol}USDT` },
    }));
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-1">
      {tags.map((tag, i) => (
        <button
          key={`${tag.symbol}-${i}`}
          onClick={() => handleClick(tag.symbol)}
          className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-opacity hover:opacity-80 active:scale-95 ${
            tag.change >= 0
              ? 'border-[#0ECB81]/30 text-[#0ECB81]'
              : 'border-[#F6465D]/30 text-[#F6465D]'
          }`}
          style={{
            backgroundColor: tag.change >= 0 ? 'rgba(14,203,129,0.07)' : 'rgba(246,70,93,0.07)',
          }}
        >
          {tag.symbol} <span className="font-bold">{tag.change >= 0 ? '+' : ''}{tag.change.toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}
