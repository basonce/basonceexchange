interface CoinTag {
  symbol: string;
  change: number;
}

interface FeedCoinTagsProps {
  tags: CoinTag[];
}

export default function FeedCoinTags({ tags }: FeedCoinTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3 mb-1">
      {tags.map((tag, i) => (
        <span
          key={`${tag.symbol}-${i}`}
          className={`text-xs font-semibold px-2 py-1 rounded ${
            tag.change >= 0
              ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
              : 'bg-[#F6465D]/10 text-[#F6465D]'
          }`}
        >
          {tag.symbol} {tag.change >= 0 ? '+' : ''}{tag.change.toFixed(2)}
        </span>
      ))}
    </div>
  );
}
