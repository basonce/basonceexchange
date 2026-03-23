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
    <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-1">
      {tags.map((tag, i) => (
        <span
          key={`${tag.symbol}-${i}`}
          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
            tag.change >= 0
              ? 'border-[#0ECB81]/30 bg-[#0ECB81]/8 text-[#0ECB81]'
              : 'border-[#F6465D]/30 bg-[#F6465D]/8 text-[#F6465D]'
          }`}
          style={{
            backgroundColor: tag.change >= 0 ? 'rgba(14,203,129,0.07)' : 'rgba(246,70,93,0.07)',
          }}
        >
          {tag.symbol} <span className="font-bold">{tag.change >= 0 ? '+' : ''}{tag.change.toFixed(2)}</span>
        </span>
      ))}
    </div>
  );
}
