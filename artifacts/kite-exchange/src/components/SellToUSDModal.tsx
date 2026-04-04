import { useState, useEffect } from 'react';
import { X, ArrowLeft, ChevronDown, CheckCircle, TrendingDown, Info, RefreshCw, Lock } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { PriceCache } from '../lib/price-cache';
import { EarnQuestPriceManager } from '../lib/earnquest-price';
import { getUserRestrictions } from '../lib/user-restrictions';

interface SellToUSDModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CoinBalance {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  logoUrl: string;
}

const COIN_META: Record<string, { name: string; logo: string }> = {
  BTC: { name: 'Bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' },
  ETH: { name: 'Ethereum', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' },
  BNB: { name: 'BNB', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' },
  SOL: { name: 'Solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
  XRP: { name: 'Ripple', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png' },
  ADA: { name: 'Cardano', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png' },
  DOGE: { name: 'Dogecoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png' },
  TRX: { name: 'Tron', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1958.png' },
  EQ: { name: 'EarnQuest', logo: '/EARNQUEST-LOGO-ICON-2.png' },
};

type Screen = 'select' | 'amount' | 'confirm' | 'done';

export default function SellToUSDModal({ isOpen, onClose }: SellToUSDModalProps) {
  const [screen, setScreen] = useState<Screen>('select');
  const [coins, setCoins] = useState<CoinBalance[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCoinPicker, setShowCoinPicker] = useState(false);
  const [isPairLocked, setIsPairLocked] = useState(false);
  const [allowedPairs, setAllowedPairs] = useState<string[]>([]);
  const [usdtFrozen, setUsdtFrozen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setScreen('select');
    setAmount('');
    setSelectedCoin(null);
    loadCoins();
    checkRestrictions();
  }, [isOpen]);

  const checkRestrictions = async () => {
    const r = await getUserRestrictions();
    if (r?.pair_lock_enabled) {
      setIsPairLocked(true);
      setAllowedPairs(r.allowed_pairs || []);
    } else {
      setIsPairLocked(false);
      setAllowedPairs([]);
    }
    setUsdtFrozen(!!r?.usdt_frozen);
  };

  const loadCoins = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: balances } = await supabase
        .from('user_balances')
        .select('symbol, balance')
        .eq('user_id', user.id)
        .neq('symbol', 'USDT');

      if (!balances) { setLoading(false); return; }

      const priceCache = PriceCache.getInstance();
      const eqMgr = EarnQuestPriceManager.getInstance();

      const result: CoinBalance[] = balances
        .filter(b => parseFloat(b.balance) > 0 && COIN_META[b.symbol])
        .map(b => {
          let price = 0;
          if (b.symbol === 'EQ') {
            price = eqMgr.getPrice();
          } else {
            const cached = priceCache.get(`${b.symbol}USDT`);
            price = cached?.price ?? 0;
          }
          const meta = COIN_META[b.symbol]!;
          return {
            symbol: b.symbol,
            name: meta.name,
            balance: parseFloat(b.balance),
            price,
            logoUrl: meta.logo,
          };
        });

      setCoins(result);
      if (result.length > 0 && !selectedCoin) setSelectedCoin(result[0]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (isPairLocked) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50">
        <div className="bg-[#0B0E11] w-full max-w-[480px] rounded-t-2xl border-t border-x border-[#22262E] p-6 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-base">Sell to USD</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Conversion Restricted</h3>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              Your account is configured for pair-locked trading only. Direct USDT conversion is not available for your account.
            </p>
            {allowedPairs.length > 0 && (
              <div className="bg-[#12151C] border border-[#22262E] rounded-xl p-4 mb-5">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Allowed Trading Pairs</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {allowedPairs.map(pair => (
                    <span key={pair} className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs font-semibold text-yellow-400">
                      {pair}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-gray-600 text-xs">Please contact support if you have questions about your account configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  const fee = selectedCoin && amount ? parseFloat(amount) * 0.001 : 0;
  const receiveAmount = selectedCoin && amount
    ? Math.max(0, parseFloat(amount) * selectedCoin.price - fee).toFixed(2)
    : '0.00';
  const usdValue = selectedCoin && amount
    ? (parseFloat(amount) * selectedCoin.price).toFixed(2)
    : '0.00';
  const isAmountValid = selectedCoin && amount &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= selectedCoin.balance;

  const setMax = () => {
    if (selectedCoin) setAmount(selectedCoin.balance.toFixed(8).replace(/\.?0+$/, ''));
  };

  const handleSell = async () => {
    if (!selectedCoin || !amount || !userId || !isAmountValid) return;
    if (usdtFrozen) return;
    setSelling(true);
    try {
      const sellAmt = parseFloat(amount);
      const usdReceived = parseFloat(receiveAmount);

      const { data: currentBalance } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('symbol', selectedCoin.symbol)
        .maybeSingle();

      const { data: usdtBalance } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('symbol', 'USDT')
        .maybeSingle();

      if (!currentBalance) throw new Error('Balance not found');

      const newCoinBalance = Math.max(0, parseFloat(currentBalance.balance) - sellAmt);
      const newUsdtBalance = (parseFloat(usdtBalance?.balance ?? '0')) + usdReceived;

      await Promise.all([
        supabase.from('user_balances').update({ balance: newCoinBalance }).eq('user_id', userId).eq('symbol', selectedCoin.symbol),
        supabase.from('user_balances').update({ balance: newUsdtBalance }).eq('user_id', userId).eq('symbol', 'USDT'),
        supabase.from('transactions').insert({
          user_id: userId,
          type: 'sell',
          symbol: selectedCoin.symbol,
          amount: sellAmt,
          usdt_value: usdReceived,
          status: 'completed',
          description: `Sold ${sellAmt} ${selectedCoin.symbol} for ${usdReceived} USDT`,
        }),
      ]);

      setScreen('done');
    } catch (err) {
      console.error('Sell failed:', err);
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50">
      <div
        className="bg-[#0B0E11] w-full max-w-[480px] rounded-t-2xl border-t border-x border-[#22262E] shadow-2xl flex flex-col"
        style={{ height: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}
      >

        {/* ===== SELECT / AMOUNT SCREEN ===== */}
        {(screen === 'select' || screen === 'amount') && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              {screen === 'amount' && (
                <button onClick={() => setScreen('select')} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex-1">
                <h2 className="text-white font-bold text-base">Sell to USD</h2>
                <p className="text-gray-500 text-xs mt-0.5">Convert crypto to USDT instantly</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-[#F0B90B] animate-spin" />
                </div>
              ) : coins.length === 0 ? (
                <div className="text-center py-16">
                  <TrendingDown className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No sellable assets found</p>
                  <p className="text-gray-600 text-xs mt-1">Deposit crypto to get started</p>
                </div>
              ) : (
                <>
                  {/* Coin selector */}
                  <div>
                    <div className="text-gray-400 text-xs font-medium mb-2">Select Asset</div>
                    <div className="relative">
                      <button
                        onClick={() => setShowCoinPicker(!showCoinPicker)}
                        className="w-full bg-[#12151C] border border-[#22262E] rounded-xl p-4 flex items-center gap-3 hover:border-[#2A2F3A] transition-colors focus:border-[#F0B90B]/40"
                      >
                        {selectedCoin ? (
                          <>
                            <img src={selectedCoin.logoUrl} alt={selectedCoin.symbol} className="w-9 h-9 rounded-full object-cover shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="text-white font-bold text-sm">{selectedCoin.symbol}</div>
                              <div className="text-gray-500 text-xs">{selectedCoin.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold text-sm tabular-nums">{selectedCoin.balance.toFixed(6).replace(/\.?0+$/, '')}</div>
                              <div className="text-gray-500 text-xs tabular-nums">${(selectedCoin.balance * selectedCoin.price).toFixed(2)}</div>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-500 text-sm">Select a coin</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 ml-1 transition-transform shrink-0 ${showCoinPicker ? 'rotate-180' : ''}`} />
                      </button>
                      {showCoinPicker && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-[#12151C] border border-[#22262E] rounded-xl shadow-2xl z-20 py-1 max-h-52 overflow-y-auto">
                          {coins.map(c => (
                            <button key={c.symbol}
                              onClick={() => { setSelectedCoin(c); setShowCoinPicker(false); setAmount(''); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1C1F27] transition-colors ${selectedCoin?.symbol === c.symbol ? 'bg-[#F0B90B]/5' : ''}`}
                            >
                              <img src={c.logoUrl} alt={c.symbol} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              <div className="flex-1 text-left">
                                <div className={`font-semibold text-sm ${selectedCoin?.symbol === c.symbol ? 'text-[#F0B90B]' : 'text-white'}`}>{c.symbol}</div>
                                <div className="text-gray-500 text-xs">{c.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-white text-sm tabular-nums">{c.balance.toFixed(6).replace(/\.?0+$/, '')}</div>
                                <div className="text-gray-500 text-xs">${(c.balance * c.price).toFixed(2)}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount input */}
                  {selectedCoin && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs font-medium">Amount to Sell</span>
                          <button onClick={setMax} className="text-[#F0B90B] text-xs font-semibold hover:text-[#E8A800] transition-colors">
                            Max: {selectedCoin.balance.toFixed(6).replace(/\.?0+$/, '')}
                          </button>
                        </div>
                        <div className={`bg-[#12151C] border rounded-xl p-4 flex items-center gap-3 transition-colors ${amount && !isAmountValid ? 'border-[#F6465D]/50' : 'border-[#22262E] focus-within:border-[#F0B90B]/40'}`}>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="flex-1 bg-transparent text-white text-xl font-bold outline-none placeholder-gray-700 tabular-nums"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <img src={selectedCoin.logoUrl} alt={selectedCoin.symbol} className="w-5 h-5 rounded-full" />
                            <span className="text-white font-semibold text-sm">{selectedCoin.symbol}</span>
                          </div>
                        </div>
                        {amount && parseFloat(amount) > selectedCoin.balance && (
                          <p className="text-[#F6465D] text-xs mt-1.5 px-1">Insufficient balance</p>
                        )}
                      </div>

                      {/* Conversion preview */}
                      {amount && parseFloat(amount) > 0 && (
                        <div className="bg-[#12151C] border border-[#22262E] rounded-2xl p-4 space-y-2.5">
                          <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Order Summary</div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Market Price</span>
                            <span className="text-white font-semibold tabular-nums">${selectedCoin.price.toFixed(4)} / {selectedCoin.symbol}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Gross Amount</span>
                            <span className="text-white font-semibold tabular-nums">${usdValue} USDT</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Fee (0.1%)</span>
                            <span className="text-gray-400 tabular-nums">-${fee.toFixed(4)} USDT</span>
                          </div>
                          <div className="h-px bg-[#22262E] my-1" />
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm font-semibold">You Receive</span>
                            <span className="text-[#0ECB81] font-bold text-base tabular-nums">${receiveAmount} USDT</span>
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div className="bg-[#1C1F27]/60 rounded-xl p-3 flex gap-2.5">
                        <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Sell executes at the current market price. Funds will be credited to your USDT spot balance instantly.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {selectedCoin && (
              <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27] space-y-2">
                {usdtFrozen && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex gap-2.5">
                    <span className="text-base leading-none">🧊</span>
                    <p className="text-[11px] text-blue-300 leading-relaxed">USDT hesabınız dondurulmuştur. Satış işlemi yapılamaz.</p>
                  </div>
                )}
                <button
                  onClick={() => { if (isAmountValid && !usdtFrozen) setScreen('confirm'); }}
                  disabled={!isAmountValid || usdtFrozen}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F6465D] hover:bg-[#D93A4F] text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {usdtFrozen ? '🧊 USDT Dondurulmuş' : amount && parseFloat(amount) > 0 ? `Sell ${amount} ${selectedCoin.symbol} → $${receiveAmount} USDT` : `Sell ${selectedCoin.symbol}`}
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== CONFIRM SCREEN ===== */}
        {screen === 'confirm' && selectedCoin && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <button onClick={() => setScreen('amount')} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-white font-bold text-base flex-1">Confirm Sell</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {/* Visual */}
              <div className="bg-[#12151C] rounded-2xl p-5 border border-[#1C1F27]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img src={selectedCoin.logoUrl} alt={selectedCoin.symbol} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <div className="text-gray-400 text-xs">You Sell</div>
                      <div className="text-white font-bold text-lg tabular-nums">{amount} {selectedCoin.symbol}</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-[#22262E] rounded-full flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-[#F6465D]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">You Receive</div>
                      <div className="text-[#0ECB81] font-bold text-lg tabular-nums">${receiveAmount}</div>
                      <div className="text-gray-500 text-xs">USDT</div>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#22262E] mb-4" />
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price</span>
                    <span className="text-white">${selectedCoin.price.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee</span>
                    <span className="text-gray-400">${fee.toFixed(4)} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="text-white">Market Order</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 rounded-xl p-3 flex gap-2.5">
                <Info className="w-4 h-4 text-[#F6465D] shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  This order will execute immediately at market price. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27] space-y-2">
              {usdtFrozen && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex gap-2.5">
                  <span className="text-base leading-none">🧊</span>
                  <p className="text-[11px] text-blue-300 leading-relaxed">USDT hesabınız dondurulmuştur. Satış işlemi yapılamaz.</p>
                </div>
              )}
              <button onClick={handleSell} disabled={selling || usdtFrozen}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F6465D] hover:bg-[#D93A4F] text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                {selling && <RefreshCw className="w-4 h-4 animate-spin" />}
                {usdtFrozen ? '🧊 USDT Dondurulmuş' : selling ? 'Processing...' : `Confirm Sell — $${receiveAmount} USDT`}
              </button>
              <button onClick={() => setScreen('amount')} className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ===== DONE SCREEN ===== */}
        {screen === 'done' && selectedCoin && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0ECB81]/15 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-[#0ECB81]" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Sold Successfully!</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Your <strong className="text-white">{amount} {selectedCoin.symbol}</strong> has been converted to USDT.
            </p>
            <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27] w-full mb-6 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sold</span>
                <span className="text-white font-semibold">{amount} {selectedCoin.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Received</span>
                <span className="text-[#0ECB81] font-bold">${receiveAmount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-[#0ECB81] font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F0B90B] hover:bg-[#E8A800] text-black transition-all active:scale-[0.98]">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
