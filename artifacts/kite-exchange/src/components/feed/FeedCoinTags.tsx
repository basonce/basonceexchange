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
    <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-0.5">
      {tags.map((tag, i) => {
        const isPositive = tag.change >= 0;
        const changeColor = isPositive ? '#0ECB81' : '#F6465D';
        const sign = isPositive ? '+' : '';
        return (
          <button
            key={`${tag.symbol}-${i}`}
            onClick={() => handleClick(tag.symbol)}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded transition-opacity hover:opacity-75 active:scale-95"
            style={{ backgroundColor: '#2B3139' }}
          >
            <span style={{ color: '#C6C6C6' }}>{tag.symbol}</span>
            <span style={{ color: changeColor }} className="font-bold">
              {sign}{tag.change.toFixed(2)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
