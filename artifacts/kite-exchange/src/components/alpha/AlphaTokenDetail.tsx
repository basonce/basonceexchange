import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ThumbsUp, ThumbsDown, Users, Activity, TrendingUp, BarChart3, Clock, ExternalLink, Award, MessageCircle, ArrowUpRight, ArrowDownRight, Globe, Send, Droplets, Crown, Share2, Star, Copy, CheckCircle, Zap, AlertTriangle, Brain, Rocket, TrendingDown, Flame } from 'lucide-react';
import type { AlphaToken, AlphaTransaction, AlphaComment, AlphaHolder } from '../../types/alpha';
import { fetchTokenTransactions, fetchTokenComments, fetchTokenHolders, generateBotTrade, updateTokenAfterTrade, calculatePriceAfterTrade } from '../../lib/alpha-service';
import { supabase } from '../../lib/supabase';
import AlphaTokenChart from './AlphaTokenChart';
import AlphaTradingPanel from './AlphaTradingPanel';
import AlphaPriceManager from '../../lib/alpha-price-manager';

const GRADIENT_COLORS = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#627EEA', '#00D1FF', '#FF6B35'];
const NETWORK_COLORS: Record<string, string> = { BNC: '#F0B90B', BSC: '#F0B90B', Ethereum: '#627EEA', Solana: '#00D1FF', Base: '#0052FF' };
const HOLDER_COLORS = ['#F0B90B', '#0ECB81', '#3861FB', '#E8831D', '#627EEA', '#00D1FF', '#F6465D', '#FF6B35', '#9B59B6', '#1ABC9C'];

const AI_ANALYSES = [
  { signal: 'STRONG BUY', score: 92, reason: 'Bonding curve 72% filled, momentum accelerating. Early entry window closing fast.', color: '#0ECB81' },
  { signal: 'BUY', score: 78, reason: 'Holder count growing 34% weekly. Volume spike indicates whale accumulation.', color: '#0ECB81' },
  { signal: 'NEUTRAL', score: 55, reason: 'Price consolidating at support. Wait for breakout confirmation above resistance.', color: '#F0B90B' },
  { signal: 'WATCH', score: 68, reason: 'Community sentiment positive. Social volume up 2.4x. Catalyst expected within 48h.', color: '#E8831D' },
  { signal: 'PUMP RISK', score: 85, reason: 'High velocity price movement detected. DYOR - risk/reward favorable for scalpers.', color: '#627EEA' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatVal(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatNumber(val: number): string {
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return val.toFixed(0);
}

function formatPrice(p: number): string {
  if (p < 0.000001) return p.toFixed(10);
  if (p < 0.0001) return p.toFixed(8);
  if (p < 0.01) return p.toFixed(6);
  if (p < 1) return p.toFixed(4);
  return p.toFixed(2);
}

interface WhaleAlert {
  id: string; username: string; type: 'buy' | 'sell'; amount: number; token: string; raisedToken: string;
}

interface Props { token: AlphaToken; isOpen: boolean; onClose: () => void; }

export default function AlphaTokenDetail({ token: initialToken, isOpen, onClose }: Props) {
  const [liveToken, setLiveToken] = useState<AlphaToken>(initialToken);
  const [transactions, setTransactions] = useState<AlphaTransaction[]>([]);
  const [comments, setComments] = useState<AlphaComment[]>([]);
  const [holders, setHolders] = useState<AlphaHolder[]>([]);
  const [activeTab, setActiveTab] = useState<'trades' | 'holders' | 'comments' | 'ai'>('trades');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTradeSuccess, setShowTradeSuccess] = useState<{ type: string; amount: number; newPrice: number } | null>(null);
  const [liveOnline] = useState(Math.floor(Math.random() * 200) + 50);
  const [whaleAlert, setWhaleAlert] = useState<WhaleAlert | null>(null);
  const [flashTxId, setFlashTxId] = useState<string | null>(null);
  const [entering, setEntering] = useState(true);
  const [showRocket, setShowRocket] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState('5M');
  const [pumpPrediction, setPumpPrediction] = useState<'pump' | 'dump' | null>(null);
  const [predictionResult, setPredictionResult] = useState<{ correct: boolean; reward: number } | null>(null);
  const [aiAnalysis] = useState(() => AI_ANALYSES[Math.floor(Math.random() * AI_ANALYSES.length)]);
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ timestamp: string; open_price: number; high_price: number; low_price: number; close_price: number; volume: number; price: number; market_cap: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const priceManagerRef = useRef(AlphaPriceManager.getInstance());

  useEffect(() => { setLiveToken(initialToken); }, [initialToken]);

  useEffect(() => {
    if (isOpen) {
      setEntering(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
    }
  }, [isOpen]);

  // Subscribe to live price updates
  useEffect(() => {
    if (!isOpen) return;
    const unsub = priceManagerRef.current.subscribe((prices) => {
      const newPrice = prices[liveToken.id];
      if (newPrice && newPrice > 0 && newPrice !== liveToken.current_price) {
        setLiveToken(prev => ({
          ...prev,
          current_price: newPrice,
          market_cap: newPrice * (prev.total_supply || 1000000000),
          price_change_24h: prev.price_change_24h + ((newPrice - prev.current_price) / Math.max(prev.current_price, 0.0000001)) * 100 * 0.05,
        }));
        // Add price point to history
        setPriceHistory(prev => {
          const intervalMs = { '1M': 60000, '5M': 300000, '15M': 900000, '1H': 3600000, '4H': 14400000, '1D': 86400000 }[activeTimeframe] || 300000;
          const now = Date.now();
          const bucketTs = Math.floor(now / intervalMs) * intervalMs;
          const existingIdx = prev.findIndex(p => Math.floor(new Date(p.timestamp).getTime() / intervalMs) * intervalMs === bucketTs);
          if (existingIdx >= 0) {
            const updated = [...prev];
            const candle = { ...updated[existingIdx] };
            candle.high_price = Math.max(candle.high_price, newPrice);
            candle.low_price = Math.min(candle.low_price, newPrice);
            candle.close_price = newPrice;
            candle.price = newPrice;
            updated[existingIdx] = candle;
            return updated;
          }
          const lastClose = prev.length > 0 ? prev[prev.length - 1].close_price : newPrice;
          return [...prev, {
            timestamp: new Date(bucketTs).toISOString(),
            open_price: lastClose, high_price: Math.max(lastClose, newPrice),
            low_price: Math.min(lastClose, newPrice), close_price: newPrice,
            volume: 0, price: newPrice, market_cap: newPrice * 1000000000,
          }];
        });
      }
    });
    return unsub;
  }, [isOpen, liveToken.id, liveToken.current_price, activeTimeframe]);

  const loadData = useCallback(async () => {
    if (!isOpen) return;
    const [txs, cmts, hlds] = await Promise.all([
      fetchTokenTransactions(liveToken.id).catch(() => []),
      fetchTokenComments(liveToken.id).catch(() => []),
      fetchTokenHolders(liveToken.id).catch(() => []),
    ]);
    if (txs.length > 0) setTransactions(txs);
    if (cmts.length > 0) setComments(cmts);
    if (hlds.length > 0) setHolders(hlds);
  }, [isOpen, liveToken.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Bot trades simulation
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(async () => {
      const botTrade = generateBotTrade(liveToken);
      setTransactions(prev => [botTrade, ...prev].slice(0, 80));
      setFlashTxId(botTrade.id);
      setTimeout(() => setFlashTxId(null), 1500);

      const isWhale = botTrade.total_value > (liveToken.raised_token === 'SOL' ? 5 : liveToken.raised_token === 'ETH' ? 0.3 : 20);
      if (isWhale && Math.random() > 0.6) {
        setWhaleAlert({ id: botTrade.id, username: botTrade.username || 'Whale', type: botTrade.tx_type as 'buy' | 'sell', amount: botTrade.total_value, token: liveToken.symbol, raisedToken: liveToken.raised_token });
        setTimeout(() => setWhaleAlert(null), 4000);
      }

      const initialPrice = liveToken.initial_price || liveToken.current_price * 0.1;
      const tradeAmt = botTrade.total_value * 0.1;
      const { newPrice, newRaised } = calculatePriceAfterTrade(botTrade.tx_type as 'buy' | 'sell', tradeAmt, liveToken.raised_amount, liveToken.target_amount, initialPrice);

      setLiveToken(prev => ({
        ...prev,
        current_price: newPrice,
        raised_amount: newRaised,
        market_cap: newPrice * (prev.total_supply || 1000000000),
        transaction_count: (prev.transaction_count || 0) + 1,
        price_change_24h: (prev.price_change_24h || 0) + ((newPrice - prev.current_price) / Math.max(prev.current_price, 0.0000001)) * 100 * 0.05,
      }));

      setPriceHistory(prev => {
        const intervalMs = { '1M': 60000, '5M': 300000, '15M': 900000, '1H': 3600000, '4H': 14400000, '1D': 86400000 }[activeTimeframe] || 300000;
        const now = Date.now();
        const bucketTs = Math.floor(now / intervalMs) * intervalMs;
        const existingIdx = prev.findIndex(p => Math.floor(new Date(p.timestamp).getTime() / intervalMs) * intervalMs === bucketTs);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const candle = { ...updated[existingIdx] };
          candle.high_price = Math.max(candle.high_price, newPrice);
          candle.low_price = Math.min(candle.low_price, newPrice);
          candle.close_price = newPrice;
          candle.price = newPrice;
          candle.volume = candle.volume + botTrade.total_value;
          updated[existingIdx] = candle;
          return updated;
        }
        const lastClose = prev.length > 0 ? prev[prev.length - 1].close_price : newPrice;
        return [...prev, {
          timestamp: new Date(bucketTs).toISOString(),
          open_price: lastClose, high_price: Math.max(lastClose, newPrice),
          low_price: Math.min(lastClose, newPrice), close_price: newPrice,
          volume: botTrade.total_value, price: newPrice, market_cap: newPrice * 1000000000,
        }];
      });
    }, 2500 + Math.random() * 4500);
    return () => clearInterval(interval);
  }, [isOpen, liveToken, activeTimeframe]);

  if (!isOpen) return null;

  const progress = Math.min((liveToken.raised_amount / liveToken.target_amount) * 100, 100);
  const idx = liveToken.symbol.charCodeAt(0) % GRADIENT_COLORS.length;
  const netColor = NETWORK_COLORS[liveToken.network] || '#666';
  const graduationMcap = liveToken.target_amount * (liveToken.raised_token === 'BNC' ? 0.5 : liveToken.raised_token === 'ETH' ? 3500 : 150);
  const contractAddr = '0x' + liveToken.id.replace(/-/g, '').slice(0, 40);

  const handleCopy = () => { navigator.clipboard.writeText(contractAddr); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const newComment: AlphaComment = {
      id: crypto.randomUUID(),
      token_id: liveToken.id,
      user_id: null,
      username: 'You',
      avatar_url: null,
      content: commentText.trim(),
      likes: 0,
      created_at: new Date().toISOString(),
    };
    setComments(prev => [newComment, ...prev]);
    setCommentText('');

    try {
      await supabase.from('alpha_comments').insert({
        id: newComment.id,
        token_id: liveToken.id,
        username: 'You',
        content: newComment.content,
        likes: 0,
      });
    } catch { /* ignore */ }
    setSubmittingComment(false);
  };

  const handleVote = async (direction: 'up' | 'down') => {
    if (voteState === direction) return;
    const delta = direction === 'up' ? 1 : -1;
    const prevDelta = voteState === 'up' ? -1 : voteState === 'down' ? 1 : 0;
    const totalDelta = delta + prevDelta;

    setVoteState(direction);
    setLiveToken(prev => ({ ...prev, community_score: prev.community_score + totalDelta }));

    try {
      await supabase.from('alpha_tokens')
        .update({ community_score: liveToken.community_score + totalDelta })
        .eq('id', liveToken.id);
    } catch { /* ignore */ }
  };

  const handleTrade = async (type: 'buy' | 'sell', amount: number) => {
    const initialPrice = liveToken.initial_price || liveToken.current_price * 0.1;
    const { newPrice, newRaised } = calculatePriceAfterTrade(type, amount, liveToken.raised_amount, liveToken.target_amount, initialPrice);

    setShowTradeSuccess({ type, amount, newPrice });
    setTimeout(() => setShowTradeSuccess(null), 3000);

    setLiveToken(prev => ({
      ...prev, current_price: newPrice, raised_amount: newRaised,
      market_cap: newPrice * (prev.total_supply || 1000000000),
      transaction_count: (prev.transaction_count || 0) + 1,
      volume_24h: (prev.volume_24h || 0) + amount,
      ath_price: Math.max(prev.ath_price || 0, newPrice),
    }));

    const newTx: AlphaTransaction = {
      id: crypto.randomUUID(), token_id: liveToken.id, user_id: null,
      tx_type: type, amount: Math.round(amount / Math.max(newPrice, 0.000000001)),
      price: newPrice, total_value: amount, wallet_address: '0xYou...r',
      username: 'You', avatar_url: null, token_symbol: liveToken.symbol,
      token_name: liveToken.name, raised_token: liveToken.raised_token,
      created_at: new Date().toISOString(),
    };
    setTransactions(prev => [newTx, ...prev]);
    setFlashTxId(newTx.id);
    setTimeout(() => setFlashTxId(null), 1500);

    if (newRaised >= liveToken.target_amount * 0.99 && !liveToken.is_graduated) {
      setShowRocket(true);
      setTimeout(() => setShowRocket(false), 5000);
    }

    updateTokenAfterTrade(liveToken.id, type, amount, liveToken).catch(() => {});
  };

  const handlePrediction = (prediction: 'pump' | 'dump') => {
    setPumpPrediction(prediction);
    setTimeout(() => {
      const didPump = Math.random() > 0.4;
      const correct = (prediction === 'pump' && didPump) || (prediction === 'dump' && !didPump);
      const reward = correct ? +(Math.random() * 5 + 1).toFixed(2) : 0;
      setPredictionResult({ correct, reward });
      setPumpPrediction(null);
      setTimeout(() => setPredictionResult(null), 5000);
    }, 3000);
  };

  const totalHolderPct = holders.reduce((s, h) => s + h.percentage, 0);

  return (
    <div className={`fixed inset-0 z-50 bg-[#0B0E11] overflow-y-auto transition-all duration-300 ${entering ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
      {showRocket && (
        <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center rocket-launch">
              <div className="text-6xl mb-4">🚀</div>
              <div className="bg-gradient-to-r from-[#F0B90B] to-[#0ECB81] text-transparent bg-clip-text text-2xl font-black">GRADUATED!</div>
              <div className="text-white text-sm mt-2">Token is now trading on Basonce Exchange!</div>
            </div>
          </div>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute confetti-piece" style={{ left: `${Math.random() * 100}%`, top: '-20px', background: ['#F0B90B', '#0ECB81', '#F6465D', '#3861FB', '#00D1FF'][i % 5], width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`, borderRadius: Math.random() > 0.5 ? '50%' : '0', animationDelay: `${Math.random() * 2}s`, animationDuration: `${2 + Math.random() * 3}s` }} />
          ))}
        </div>
      )}

      {whaleAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] whale-alert-enter">
          <div className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-2xl border backdrop-blur-md ${whaleAlert.type === 'buy' ? 'bg-[#0ECB81]/20 border-[#0ECB81]/40' : 'bg-[#F6465D]/20 border-[#F6465D]/40'}`}>
            <AlertTriangle className={`w-4 h-4 ${whaleAlert.type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`} />
            <div>
              <div className="text-white text-xs font-black">Whale Alert!</div>
              <div className={`text-[11px] ${whaleAlert.type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                {whaleAlert.username} {whaleAlert.type === 'buy' ? 'bought' : 'sold'} {whaleAlert.amount.toFixed(1)} {whaleAlert.raisedToken}
              </div>
            </div>
            <Zap className="w-4 h-4 text-[#F0B90B] animate-pulse" />
          </div>
        </div>
      )}

      {showTradeSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] trade-success-enter">
          <div className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-2xl ${showTradeSuccess.type === 'buy' ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'}`}>
            {showTradeSuccess.type === 'buy' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {showTradeSuccess.type === 'buy' ? 'Bought' : 'Sold'} {showTradeSuccess.amount} {liveToken.raised_token}
            <span className="text-white/80 text-[11px]">@ ${formatPrice(showTradeSuccess.newPrice)}</span>
          </div>
        </div>
      )}

      {predictionResult && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] trade-success-enter">
          <div className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-2xl ${predictionResult.correct ? 'bg-[#0ECB81] text-white' : 'bg-[#F6465D] text-white'}`}>
            {predictionResult.correct ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {predictionResult.correct ? `Correct! +${predictionResult.reward} BNC earned` : 'Wrong prediction. Better luck next time!'}
          </div>
        </div>
      )}

      <div className="sticky top-0 bg-[#0B0E11]/95 backdrop-blur-sm z-10 border-b border-[#2B3139]/50">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <button onClick={onClose} className="p-1.5 hover:bg-[#2B3139] rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${GRADIENT_COLORS[idx]}dd, ${GRADIENT_COLORS[(idx + 3) % GRADIENT_COLORS.length]}aa)` }}>
              <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] font-black">{liveToken.symbol.slice(0, 2)}</span>
              {liveToken.logo_url && <img src={liveToken.logo_url} alt="" className="w-full h-full object-cover relative z-10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
            </div>
            <div className="text-center">
              <span className="font-bold text-white text-sm block leading-tight">{liveToken.name}</span>
              <span className="text-gray-500 text-[10px]">${liveToken.symbol}</span>
            </div>
            {liveToken.is_graduated && <Award className="w-4 h-4 text-[#0ECB81]" />}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: `${netColor}15` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: netColor }} />
              <span className="text-[10px] font-bold" style={{ color: netColor }}>{liveToken.network === 'BSC' ? 'BNC' : liveToken.network}</span>
            </div>
            <button className="p-1.5 hover:bg-[#2B3139] rounded-lg transition-colors">
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
            {liveOnline} online
          </div>
          <div className="flex items-center gap-1 text-[10px]" onClick={handleCopy} role="button">
            <span className="text-gray-600 font-mono">{contractAddr.slice(0, 8)}...{contractAddr.slice(-6)}</span>
            {copied ? <CheckCircle className="w-3 h-3 text-[#0ECB81]" /> : <Copy className="w-3 h-3 text-gray-600" />}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="px-4 pt-3 pb-24">
        <div className="fade-in-up" style={{ animationDelay: '0.05s' }}>
          <AlphaTokenChart
            priceHistory={priceHistory}
            currentPrice={liveToken.current_price}
            priceChange={liveToken.price_change_24h || 0}
            onTimeframeChange={tf => setActiveTimeframe(tf)}
          />
        </div>

        <div className="grid grid-cols-4 gap-1.5 mt-3 fade-in-up" style={{ animationDelay: '0.1s' }}>
          {[
            { label: 'MCap', value: formatVal(liveToken.market_cap), icon: TrendingUp, color: '#F0B90B' },
            { label: 'Volume', value: formatVal(liveToken.volume_24h), icon: BarChart3, color: '#E8831D' },
            { label: 'Holders', value: formatNumber(liveToken.holder_count), icon: Users, color: '#0ECB81' },
            { label: 'Liquidity', value: formatVal(liveToken.liquidity || 0), icon: Droplets, color: '#3861FB' },
          ].map(s => (
            <div key={s.label} className="bg-[#181A20] rounded-xl p-2.5 border border-[#2B3139]/30">
              <div className="flex items-center gap-1 mb-1">
                <s.icon className="w-3 h-3" style={{ color: s.color }} />
                <span className="text-[9px] text-gray-500">{s.label}</span>
              </div>
              <span className="text-white font-bold text-xs block">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="bg-[#181A20] rounded-xl p-3 border border-[#2B3139]/50 mt-3 fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Bonding Curve</span>
            <span className={`text-sm font-black ${liveToken.is_graduated ? 'text-[#0ECB81]' : progress > 80 ? 'text-[#F0B90B]' : 'text-white'}`}>{progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-[#2B3139] rounded-full overflow-hidden mb-2 relative">
            <div className={`h-full rounded-full transition-all duration-700 ${liveToken.is_graduated ? 'bg-gradient-to-r from-[#0ECB81] to-[#0ECB81]/80' : progress > 80 ? 'bg-gradient-to-r from-[#F0B90B] to-[#F8D12F]' : 'bg-gradient-to-r from-[#F0B90B]/60 to-[#F0B90B]'}`} style={{ width: `${progress}%` }} />
            {progress > 80 && !liveToken.is_graduated && <div className="absolute inset-0 overflow-hidden rounded-full"><div className="shimmer-bar" /></div>}
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">{liveToken.raised_amount.toFixed(1)} / {liveToken.target_amount} {liveToken.raised_token}</span>
            <span className="text-gray-500">Grad at {formatVal(graduationMcap)}</span>
          </div>
          {liveToken.is_graduated && (
            <div className="mt-2 py-1.5 bg-[#0ECB81]/10 rounded-lg text-center">
              <span className="text-[#0ECB81] text-[11px] font-bold flex items-center justify-center gap-1"><Crown className="w-3.5 h-3.5" /> Graduated - Trading on Basonce Exchange</span>
            </div>
          )}
        </div>

        <div className="bg-[#181A20] rounded-xl border border-[#2B3139]/50 mt-3 p-3.5 fade-in-up" style={{ animationDelay: '0.17s' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#F0B90B]/15 flex items-center justify-center"><Flame className="w-3.5 h-3.5 text-[#F0B90B]" /></div>
            <span className="text-sm font-bold text-white">Pump or Dump?</span>
            <span className="text-[10px] text-gray-500 ml-auto">Predict & earn BNC</span>
          </div>
          {pumpPrediction ? (
            <div className="text-center py-3">
              <div className="w-8 h-8 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-[#F0B90B] text-xs font-bold">Analyzing market...</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handlePrediction('pump')} className="flex-1 py-2.5 rounded-xl bg-[#0ECB81]/10 border border-[#0ECB81]/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0ECB81]" /><span className="text-[#0ECB81] font-bold text-sm">Pump</span><Rocket className="w-3.5 h-3.5 text-[#0ECB81]" />
              </button>
              <button onClick={() => handlePrediction('dump')} className="flex-1 py-2.5 rounded-xl bg-[#F6465D]/10 border border-[#F6465D]/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#F6465D]" /><span className="text-[#F6465D] font-bold text-sm">Dump</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 fade-in-up" style={{ animationDelay: '0.2s' }}>
          <AlphaTradingPanel token={liveToken} onTrade={handleTrade} />
        </div>

        <div className="bg-[#181A20] rounded-xl p-3.5 border border-[#2B3139]/50 mt-3 fade-in-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-white">Community</span>
            <span className={`text-lg font-black ${liveToken.community_score >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {liveToken.community_score > 0 ? '+' : ''}{liveToken.community_score}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleVote('up')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border active:scale-95 transition-all ${voteState === 'up' ? 'bg-[#0ECB81]/20 border-[#0ECB81]/50' : 'bg-[#0ECB81]/10 border-[#0ECB81]/20 hover:bg-[#0ECB81]/15'}`}>
              <ThumbsUp className="w-4 h-4 text-[#0ECB81]" />
              <span className="text-[#0ECB81] font-bold text-sm">{Math.max(0, liveToken.community_score)}</span>
            </button>
            <button onClick={() => handleVote('down')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border active:scale-95 transition-all ${voteState === 'down' ? 'bg-[#F6465D]/20 border-[#F6465D]/50' : 'bg-[#F6465D]/10 border-[#F6465D]/20 hover:bg-[#F6465D]/15'}`}>
              <ThumbsDown className="w-4 h-4 text-[#F6465D]" />
              <span className="text-[#F6465D] font-bold text-sm">{Math.max(0, -liveToken.community_score + 15)}</span>
            </button>
            <button className="px-3 py-2.5 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/20 active:scale-95 transition-transform hover:bg-[#F0B90B]/15">
              <Star className="w-4 h-4 text-[#F0B90B]" />
            </button>
          </div>
        </div>

        {liveToken.description && (
          <div className="bg-[#181A20] rounded-xl p-3.5 border border-[#2B3139]/50 mt-3 fade-in-up" style={{ animationDelay: '0.3s' }}>
            <span className="text-sm font-bold text-white block mb-2">About</span>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">{liveToken.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {liveToken.website_url && <a href={liveToken.website_url} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2B3139] text-gray-400 text-[11px] hover:text-white transition-colors"><Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" /></a>}
              {liveToken.twitter_url && <a href={liveToken.twitter_url} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2B3139] text-gray-400 text-[11px] hover:text-white transition-colors">Twitter <ExternalLink className="w-2.5 h-2.5" /></a>}
            </div>
          </div>
        )}

        <div className="bg-[#181A20] rounded-xl border border-[#2B3139]/50 mt-3 overflow-hidden fade-in-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex border-b border-[#2B3139]/50">
            {[
              { id: 'trades' as const, label: 'Trades', icon: Activity, count: transactions.length },
              { id: 'holders' as const, label: 'Holders', icon: Users, count: holders.length },
              { id: 'ai' as const, label: 'AI', icon: Brain, count: 0 },
              { id: 'comments' as const, label: 'Chat', icon: MessageCircle, count: comments.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 text-center text-[11px] font-bold transition-colors flex items-center justify-center gap-1 relative ${activeTab === tab.id ? 'text-[#F0B90B]' : 'text-gray-500'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count > 0 && <span className={`text-[9px] px-1 py-0.5 rounded ${activeTab === tab.id ? 'bg-[#F0B90B]/15' : 'bg-[#2B3139]'}`}>{tab.count}</span>}
                {activeTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#F0B90B] rounded-full" />}
              </button>
            ))}
          </div>

          {activeTab === 'trades' && (
            <div className="max-h-80 overflow-y-auto">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 px-3 py-2 border-b border-[#2B3139]/50 text-[9px] text-gray-600 font-bold uppercase">
                <span>Type</span><span>Account</span><span className="text-right">Amount</span><span className="text-right">Time</span>
              </div>
              {transactions.length === 0 && <div className="py-10 text-center text-gray-600 text-xs">No trades yet - be the first!</div>}
              {transactions.map(tx => (
                <div key={tx.id} className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-2 px-3 py-2 border-b border-[#2B3139]/20 last:border-0 items-center transition-all duration-500 ${flashTxId === tx.id ? (tx.tx_type === 'buy' ? 'bg-[#0ECB81]/10' : 'bg-[#F6465D]/10') : 'bg-transparent'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${tx.tx_type === 'buy' ? 'bg-[#0ECB81]/15' : 'bg-[#F6465D]/15'}`}>
                    {tx.tx_type === 'buy' ? <ArrowUpRight className="w-3 h-3 text-[#0ECB81]" /> : <ArrowDownRight className="w-3 h-3 text-[#F6465D]" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-white text-[11px] font-medium truncate block">{tx.username || 'Anonymous'}</span>
                    <span className="text-gray-600 text-[9px] font-mono block truncate">{tx.wallet_address}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-bold block ${tx.tx_type === 'buy' ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>{tx.tx_type === 'buy' ? '+' : '-'}{tx.total_value.toFixed(1)} {tx.raised_token}</span>
                  </div>
                  <span className="text-gray-600 text-[9px] text-right whitespace-nowrap">{timeAgo(tx.created_at)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="p-4 space-y-3">
              <div className="rounded-xl p-4 border" style={{ backgroundColor: `${aiAnalysis.color}10`, borderColor: `${aiAnalysis.color}30` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Brain className="w-5 h-5" style={{ color: aiAnalysis.color }} /><span className="font-black text-sm" style={{ color: aiAnalysis.color }}>{aiAnalysis.signal}</span></div>
                  <div className="flex items-center gap-1"><span className="text-white font-black text-xl">{aiAnalysis.score}</span><span className="text-gray-500 text-xs">/100</span></div>
                </div>
                <div className="h-2 bg-[#2B3139] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${aiAnalysis.score}%`, background: `linear-gradient(90deg, ${aiAnalysis.color}80, ${aiAnalysis.color})` }} />
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">{aiAnalysis.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Risk Score', value: `${Math.round(100 - aiAnalysis.score)}%`, color: aiAnalysis.score > 70 ? '#0ECB81' : '#F6465D' },
                  { label: 'Pump Potential', value: `${Math.round(aiAnalysis.score * 1.2)}%`, color: '#F0B90B' },
                  { label: 'Holder Growth', value: `+${Math.round(Math.random() * 30 + 10)}%`, color: '#0ECB81' },
                  { label: 'Volume Trend', value: `${Math.random() > 0.5 ? '+' : '-'}${Math.round(Math.random() * 50 + 10)}%`, color: Math.random() > 0.5 ? '#0ECB81' : '#F6465D' },
                ].map(m => (
                  <div key={m.label} className="bg-[#0B0E11] rounded-xl p-3 border border-[#2B3139]/30">
                    <span className="text-gray-500 text-[10px] block">{m.label}</span>
                    <span className="font-black text-base block mt-0.5" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#0B0E11] rounded-xl p-3 border border-[#2B3139]/30">
                <span className="text-gray-500 text-[10px] block mb-1.5">Sentiment Distribution</span>
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0ECB81]" style={{ width: `${aiAnalysis.score}%` }} />
                  <div className="bg-[#F6465D]" style={{ width: `${100 - aiAnalysis.score}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[#0ECB81] text-[9px]">Bull {aiAnalysis.score}%</span>
                  <span className="text-[#F6465D] text-[9px]">Bear {100 - aiAnalysis.score}%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'holders' && (
            <div>
              <div className="p-3 border-b border-[#2B3139]/50">
                <div className="h-4 rounded-full overflow-hidden flex">
                  {holders.map((h, i) => (
                    <div key={h.id} className="h-full" style={{ width: `${h.percentage}%`, backgroundColor: HOLDER_COLORS[i % HOLDER_COLORS.length], minWidth: h.percentage > 0.5 ? '4px' : '2px' }} />
                  ))}
                  {totalHolderPct < 100 && <div className="h-full bg-[#2B3139]" style={{ width: `${100 - totalHolderPct}%` }} />}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {holders.length === 0 && <div className="py-10 text-center text-gray-600 text-xs">No holder data yet</div>}
                {holders.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2B3139]/20 last:border-0">
                    <span className="text-[10px] text-gray-600 font-bold w-4">#{i + 1}</span>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: HOLDER_COLORS[i % HOLDER_COLORS.length] }} />
                    <div className="flex-1 min-w-0"><span className="text-white text-[11px] font-medium truncate block">{h.username}</span></div>
                    <div className="text-right">
                      <span className="text-white text-[11px] font-bold block">{formatNumber(h.amount)}</span>
                      <span className="text-gray-500 text-[9px]">{h.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2B3139]/50">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                  placeholder="Write a comment..."
                  className="flex-1 bg-[#0B0E11] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-[#F0B90B]/50 border border-[#2B3139]"
                />
                <button onClick={handleSubmitComment} disabled={submittingComment || !commentText.trim()} className="p-2 bg-[#F0B90B] rounded-lg active:scale-95 transition-transform disabled:opacity-50">
                  <Send className="w-3.5 h-3.5 text-[#0B0E11]" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {comments.length === 0 && <div className="py-10 text-center text-gray-600 text-xs">Be the first to comment!</div>}
                {comments.map(cmt => (
                  <div key={cmt.id} className="px-3 py-2.5 border-b border-[#2B3139]/20 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      {cmt.avatar_url ? (
                        <img src={cmt.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#2B3139] flex items-center justify-center"><span className="text-[8px] text-gray-400 font-bold">{cmt.username.slice(0, 1)}</span></div>
                      )}
                      <span className="text-white text-[11px] font-medium">{cmt.username}</span>
                      <span className="text-gray-600 text-[9px] flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {timeAgo(cmt.created_at)}</span>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed pl-7">{cmt.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#181A20] rounded-xl p-3 border border-[#2B3139]/50 mt-3 fade-in-up" style={{ animationDelay: '0.4s' }}>
          <span className="text-xs font-bold text-white block mb-2">Token Info</span>
          <div className="space-y-1.5">
            {[
              { l: 'Total Supply', v: formatNumber(liveToken.total_supply || 1000000000) },
              { l: 'Initial Price', v: `$${formatPrice(liveToken.initial_price || 0)}` },
              { l: 'ATH Price', v: `$${formatPrice(liveToken.ath_price || 0)}` },
              { l: 'Transactions', v: liveToken.transaction_count.toLocaleString() },
              { l: 'Created', v: new Date(liveToken.created_at).toLocaleDateString() },
            ].map(info => (
              <div key={info.l} className="flex items-center justify-between py-1 border-b border-[#2B3139]/20 last:border-0">
                <span className="text-gray-500 text-[11px]">{info.l}</span>
                <span className="text-white text-[11px] font-bold">{info.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .fade-in-up { animation: fadeInUp 0.4s ease-out both; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .whale-alert-enter { animation: whaleAlertIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes whaleAlertIn { from { opacity: 0; transform: translate(-50%, -20px) scale(0.9); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .trade-success-enter { animation: tradeSuccessIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes tradeSuccessIn { from { opacity: 0; transform: translate(-50%, -10px) scale(0.95); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .shimmer-bar { position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); animation: shimmer 2s infinite; }
        @keyframes shimmer { 100% { left: 100%; } }
        .rocket-launch { animation: rocketLaunch 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes rocketLaunch { from { opacity: 0; transform: scale(0.5) translateY(50px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .confetti-piece { animation: confettiFall linear both; position: absolute; }
        @keyframes confettiFall { from { transform: translateY(-20px) rotate(0deg); opacity: 1; } to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
      `}</style>
    </div>
  );
}
