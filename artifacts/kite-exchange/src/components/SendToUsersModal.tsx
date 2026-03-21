import { useState, useEffect } from 'react';
import { X, ArrowLeft, Search, CheckCircle, Send, User, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PriceCache } from '../lib/price-cache';
import { EarnQuestPriceManager } from '../lib/earnquest-price';

interface SendToUsersModalProps {
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

interface FoundUser {
  id: string;
  username: string;
  avatar_url?: string;
  user_id_display: string;
}

const COIN_META: Record<string, { name: string; logo: string }> = {
  USDT: { name: 'Tether', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png' },
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

type Screen = 'recipient' | 'amount' | 'confirm' | 'done';
type SearchMethod = 'email' | 'phone' | 'id';

export default function SendToUsersModal({ isOpen, onClose }: SendToUsersModalProps) {
  const [screen, setScreen] = useState<Screen>('recipient');
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('email');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState('');
  const [coins, setCoins] = useState<CoinBalance[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCoinPicker, setShowCoinPicker] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setScreen('recipient');
    setSearchQuery('');
    setFoundUser(null);
    setSearchError('');
    setAmount('');
    setNote('');
    loadUserAndCoins();
  }, [isOpen]);

  const loadUserAndCoins = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: balances } = await supabase
      .from('user_balances')
      .select('symbol, balance')
      .eq('user_id', user.id);

    if (!balances) return;

    const priceCache = PriceCache.getInstance();
    const eqMgr = EarnQuestPriceManager.getInstance();

    const result: CoinBalance[] = balances
      .filter(b => parseFloat(b.balance) > 0 && COIN_META[b.symbol])
      .map(b => {
        let price = b.symbol === 'USDT' ? 1 : 0;
        if (b.symbol === 'EQ') price = eqMgr.getPrice();
        else if (b.symbol !== 'USDT') {
          const cached = priceCache.get(`${b.symbol}USDT`);
          price = cached?.price ?? 0;
        }
        const meta = COIN_META[b.symbol]!;
        return { symbol: b.symbol, name: meta.name, balance: parseFloat(b.balance), price, logoUrl: meta.logo };
      });

    setCoins(result);
    const usdt = result.find(c => c.symbol === 'USDT') || result[0];
    if (usdt) setSelectedCoin(usdt);
  };

  if (!isOpen) return null;

  const searchPlaceholder: Record<SearchMethod, string> = {
    email: 'Enter email address',
    phone: 'Enter phone number',
    id: 'Enter User ID (e.g. 255001)',
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setFoundUser(null);

    try {
      let query = supabase.from('user_profiles').select('user_id, username, avatar_url, user_id_display');

      if (searchMethod === 'email') {
        const { data: authData } = await supabase.rpc('find_user_by_email', { p_email: searchQuery.trim().toLowerCase() });
        if (authData && authData.length > 0) {
          const uid = authData[0].id;
          const { data: profile } = await supabase.from('user_profiles').select('user_id, username, avatar_url, user_id_display').eq('user_id', uid).maybeSingle();
          if (profile && profile.user_id !== userId) {
            setFoundUser({ id: profile.user_id, username: profile.username || 'Unknown', avatar_url: profile.avatar_url, user_id_display: profile.user_id_display || profile.user_id.slice(0, 8) });
          } else {
            setSearchError('User not found');
          }
        } else {
          setSearchError('No account found with this email');
        }
      } else if (searchMethod === 'id') {
        const { data: profile } = await supabase.from('user_profiles').select('user_id, username, avatar_url, user_id_display').eq('user_id_display', searchQuery.trim()).maybeSingle();
        if (profile && profile.user_id !== userId) {
          setFoundUser({ id: profile.user_id, username: profile.username || 'Unknown', avatar_url: profile.avatar_url, user_id_display: profile.user_id_display || profile.user_id.slice(0, 8) });
        } else {
          setSearchError('User not found');
        }
      } else {
        const { data: profile } = await supabase.from('user_profiles').select('user_id, username, avatar_url, user_id_display').ilike('phone', `%${searchQuery.trim()}%`).maybeSingle();
        if (profile && profile.user_id !== userId) {
          setFoundUser({ id: profile.user_id, username: profile.username || 'Unknown', avatar_url: profile.avatar_url, user_id_display: profile.user_id_display || profile.user_id.slice(0, 8) });
        } else {
          setSearchError('User not found');
        }
      }
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!foundUser || !selectedCoin || !amount || !userId) return;
    const sendAmt = parseFloat(amount);
    if (sendAmt <= 0 || sendAmt > selectedCoin.balance) return;

    setSending(true);
    try {
      const { data: senderBal } = await supabase.from('user_balances').select('balance').eq('user_id', userId).eq('symbol', selectedCoin.symbol).maybeSingle();
      const { data: recipientBal } = await supabase.from('user_balances').select('balance').eq('user_id', foundUser.id).eq('symbol', selectedCoin.symbol).maybeSingle();

      if (!senderBal) throw new Error('Balance not found');
      const newSenderBal = parseFloat(senderBal.balance) - sendAmt;
      if (newSenderBal < 0) throw new Error('Insufficient balance');
      const newRecipientBal = (parseFloat(recipientBal?.balance ?? '0')) + sendAmt;

      await Promise.all([
        supabase.from('user_balances').update({ balance: newSenderBal }).eq('user_id', userId).eq('symbol', selectedCoin.symbol),
        supabase.from('user_balances').upsert({ user_id: foundUser.id, symbol: selectedCoin.symbol, balance: newRecipientBal }, { onConflict: 'user_id,symbol' }),
        supabase.from('transactions').insert([
          { user_id: userId, type: 'send', symbol: selectedCoin.symbol, amount: sendAmt, status: 'completed', description: `Sent to ${foundUser.username}${note ? ': ' + note : ''}` },
          { user_id: foundUser.id, type: 'receive', symbol: selectedCoin.symbol, amount: sendAmt, status: 'completed', description: `Received from user${note ? ': ' + note : ''}` },
        ]),
      ]);

      setScreen('done');
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  const usdValue = selectedCoin && amount ? (parseFloat(amount) * selectedCoin.price).toFixed(2) : '0.00';
  const isAmountValid = selectedCoin && amount && parseFloat(amount) > 0 && parseFloat(amount) <= selectedCoin.balance;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-end justify-center z-50">
      <div
        className="bg-[#0B0E11] w-full max-w-[480px] rounded-t-2xl border-t border-x border-[#22262E] shadow-2xl flex flex-col"
        style={{ height: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}
      >

        {/* ===== RECIPIENT SCREEN ===== */}
        {screen === 'recipient' && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <div className="flex-1">
                <h2 className="text-white font-bold text-base">Send to Users</h2>
                <p className="text-gray-500 text-xs mt-0.5">Internal transfer — zero fees</p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {/* Search method tabs */}
              <div className="flex bg-[#12151C] rounded-xl p-1 gap-1">
                {(['email', 'phone', 'id'] as SearchMethod[]).map(m => (
                  <button key={m} onClick={() => { setSearchMethod(m); setSearchQuery(''); setFoundUser(null); setSearchError(''); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${searchMethod === m ? 'bg-[#F0B90B] text-black' : 'text-gray-500 hover:text-gray-300'}`}>
                    {m === 'id' ? 'User ID' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div>
                <div className="bg-[#12151C] border border-[#22262E] rounded-xl p-3 flex items-center gap-3 focus-within:border-[#F0B90B]/40 transition-colors">
                  <Search className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type={searchMethod === 'phone' ? 'tel' : 'text'}
                    placeholder={searchPlaceholder[searchMethod]}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setFoundUser(null); setSearchError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                  />
                  {searchQuery && (
                    <button onClick={handleSearch} disabled={searching}
                      className="bg-[#F0B90B] hover:bg-[#E8A800] text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-60">
                      {searching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      Search
                    </button>
                  )}
                </div>
              </div>

              {/* Search error */}
              {searchError && (
                <div className="flex items-center gap-2.5 bg-[#F6465D]/8 border border-[#F6465D]/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-[#F6465D] shrink-0" />
                  <span className="text-[#F6465D] text-sm">{searchError}</span>
                </div>
              )}

              {/* Found user */}
              {foundUser && (
                <div className="bg-[#12151C] border border-[#0ECB81]/30 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {foundUser.avatar_url ? (
                      <img src={foundUser.avatar_url} alt={foundUser.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-[#0ECB81]/30" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#F0B90B]/20 flex items-center justify-center ring-2 ring-[#0ECB81]/30">
                        <User className="w-6 h-6 text-[#F0B90B]" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">{foundUser.username}</div>
                      <div className="text-gray-500 text-xs mt-0.5">ID: {foundUser.user_id_display}</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0ECB81]/10 px-2 py-1 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 text-[#0ECB81]" />
                      <span className="text-[#0ECB81] text-xs font-semibold">Verified</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs">User found. Proceed to select amount.</p>
                </div>
              )}

              {/* Info box */}
              {!foundUser && !searchError && (
                <div className="bg-[#1C1F27]/40 rounded-xl p-4 space-y-2.5">
                  <div className="text-gray-400 text-xs font-semibold mb-3">How it works</div>
                  {[
                    { icon: '1', text: 'Search for the recipient by email, phone, or User ID' },
                    { icon: '2', text: 'Select asset and enter the amount to send' },
                    { icon: '3', text: 'Confirm and funds arrive instantly — zero fees' },
                  ].map(item => (
                    <div key={item.icon} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#F0B90B]/20 text-[#F0B90B] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{item.icon}</div>
                      <p className="text-gray-500 text-xs leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {foundUser && (
              <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27]">
                <button onClick={() => setScreen('amount')}
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F0B90B] hover:bg-[#E8A800] text-black transition-all active:scale-[0.98]">
                  Continue to Amount
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== AMOUNT SCREEN ===== */}
        {screen === 'amount' && foundUser && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <button onClick={() => setScreen('recipient')} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-white font-bold text-base flex-1">Select Amount</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {/* Recipient mini card */}
              <div className="flex items-center gap-3 bg-[#12151C] border border-[#22262E] rounded-xl px-4 py-3">
                {foundUser.avatar_url ? (
                  <img src={foundUser.avatar_url} alt={foundUser.username} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#F0B90B]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#F0B90B]" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{foundUser.username}</div>
                  <div className="text-gray-500 text-xs">ID: {foundUser.user_id_display}</div>
                </div>
                <CheckCircle className="w-4 h-4 text-[#0ECB81]" />
              </div>

              {/* Coin selector */}
              <div>
                <div className="text-gray-400 text-xs font-medium mb-2">Asset</div>
                <div className="relative">
                  <button onClick={() => setShowCoinPicker(!showCoinPicker)}
                    className="w-full bg-[#12151C] border border-[#22262E] rounded-xl p-3.5 flex items-center gap-3 hover:border-[#2A2F3A] transition-colors">
                    {selectedCoin ? (
                      <>
                        <img src={selectedCoin.logoUrl} alt={selectedCoin.symbol} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="text-white font-semibold text-sm">{selectedCoin.symbol}</div>
                          <div className="text-gray-500 text-xs">Balance: {selectedCoin.balance.toFixed(6).replace(/\.?0+$/, '')}</div>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">Select asset</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${showCoinPicker ? 'rotate-180' : ''}`} />
                  </button>
                  {showCoinPicker && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#12151C] border border-[#22262E] rounded-xl shadow-2xl z-20 py-1 max-h-48 overflow-y-auto">
                      {coins.map(c => (
                        <button key={c.symbol} onClick={() => { setSelectedCoin(c); setShowCoinPicker(false); setAmount(''); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1C1F27] transition-colors ${selectedCoin?.symbol === c.symbol ? 'bg-[#F0B90B]/5' : ''}`}>
                          <img src={c.logoUrl} alt={c.symbol} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          <div className="flex-1 text-left">
                            <div className={`font-semibold text-sm ${selectedCoin?.symbol === c.symbol ? 'text-[#F0B90B]' : 'text-white'}`}>{c.symbol}</div>
                            <div className="text-gray-500 text-xs">{c.name}</div>
                          </div>
                          <span className="text-gray-400 text-xs tabular-nums">{c.balance.toFixed(4)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              {selectedCoin && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs font-medium">Amount</span>
                      <button onClick={() => setAmount(selectedCoin.balance.toFixed(8).replace(/\.?0+$/, ''))}
                        className="text-[#F0B90B] text-xs font-semibold hover:text-[#E8A800] transition-colors">
                        Max
                      </button>
                    </div>
                    <div className={`bg-[#12151C] border rounded-xl p-4 flex items-center gap-3 transition-colors ${amount && !isAmountValid ? 'border-[#F6465D]/50' : 'border-[#22262E] focus-within:border-[#F0B90B]/40'}`}>
                      <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                        className="flex-1 bg-transparent text-white text-2xl font-bold outline-none placeholder-gray-700 tabular-nums" />
                      <div className="flex items-center gap-2 shrink-0">
                        <img src={selectedCoin.logoUrl} alt={selectedCoin.symbol} className="w-5 h-5 rounded-full" />
                        <span className="text-white font-semibold text-sm">{selectedCoin.symbol}</span>
                      </div>
                    </div>
                    {amount && parseFloat(amount) > 0 && (
                      <div className="mt-1.5 text-gray-500 text-xs px-1 tabular-nums">≈ ${usdValue} USD</div>
                    )}
                    {amount && parseFloat(amount) > selectedCoin.balance && (
                      <p className="text-[#F6465D] text-xs mt-1 px-1">Insufficient balance</p>
                    )}
                  </div>

                  {/* Note */}
                  <div>
                    <div className="text-gray-400 text-xs font-medium mb-2">Note (Optional)</div>
                    <input type="text" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} maxLength={100}
                      className="w-full bg-[#12151C] border border-[#22262E] rounded-xl p-3.5 text-white text-sm outline-none placeholder-gray-600 focus:border-[#F0B90B]/40 transition-colors" />
                  </div>
                </>
              )}

              {/* Zero fee notice */}
              <div className="bg-[#0ECB81]/5 border border-[#0ECB81]/15 rounded-xl p-3 flex gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Internal transfers are completely free with no network fees. Funds arrive instantly to the recipient.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27]">
              <button onClick={() => { if (isAmountValid) setScreen('confirm'); }} disabled={!isAmountValid}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F0B90B] hover:bg-[#E8A800] text-black transition-all active:scale-[0.98] disabled:opacity-40">
                {amount && parseFloat(amount) > 0 && selectedCoin ? `Send ${amount} ${selectedCoin.symbol}` : 'Enter Amount'}
              </button>
            </div>
          </>
        )}

        {/* ===== CONFIRM SCREEN ===== */}
        {screen === 'confirm' && foundUser && selectedCoin && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-[#1C1F27]">
              <button onClick={() => setScreen('amount')} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-white font-bold text-base flex-1">Confirm Transfer</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#22262E] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
              {/* Visual transfer card */}
              <div className="bg-[#12151C] rounded-2xl p-5 border border-[#1C1F27]">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F0B90B]/20 flex items-center justify-center mx-auto mb-1.5">
                      <User className="w-6 h-6 text-[#F0B90B]" />
                    </div>
                    <div className="text-gray-500 text-xs">You</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1">
                    <div className="flex-1 h-px bg-gradient-to-r from-[#F0B90B]/30 to-[#0ECB81]/30" />
                    <div className="w-8 h-8 rounded-full bg-[#1C1F27] flex items-center justify-center border border-[#22262E]">
                      <Send className="w-3.5 h-3.5 text-[#F0B90B]" />
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-[#0ECB81]/30 to-transparent" />
                  </div>
                  <div className="text-center">
                    {foundUser.avatar_url ? (
                      <img src={foundUser.avatar_url} alt={foundUser.username} className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 ring-2 ring-[#0ECB81]/30" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#0ECB81]/20 flex items-center justify-center mx-auto mb-1.5">
                        <User className="w-6 h-6 text-[#0ECB81]" />
                      </div>
                    )}
                    <div className="text-white text-xs font-semibold">{foundUser.username}</div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <img src={selectedCoin.logoUrl} alt={selectedCoin.symbol} className="w-6 h-6 rounded-full" />
                    <span className="text-white font-bold text-2xl tabular-nums">{amount}</span>
                    <span className="text-gray-400 font-semibold">{selectedCoin.symbol}</span>
                  </div>
                  <div className="text-gray-500 text-sm mt-1">≈ ${usdValue} USD</div>
                </div>

                <div className="h-px bg-[#22262E] mb-4" />
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Recipient</span>
                    <span className="text-white font-semibold">{foundUser.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Network Fee</span>
                    <span className="text-[#0ECB81] font-semibold">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Arrival Time</span>
                    <span className="text-white font-semibold">Instant</span>
                  </div>
                  {note && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Note</span>
                      <span className="text-white font-semibold text-right max-w-[60%] truncate">{note}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#F0B90B]/5 border border-[#F0B90B]/15 rounded-xl p-3 flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Please verify the recipient before confirming. Transfers cannot be reversed once completed.
                </p>
              </div>
            </div>

            <div className="px-4 py-3 shrink-0 border-t border-[#1C1F27] space-y-2">
              <button onClick={handleSend} disabled={sending}
                className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#F0B90B] hover:bg-[#E8A800] text-black transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2">
                {sending && <RefreshCw className="w-4 h-4 animate-spin" />}
                {sending ? 'Sending...' : `Confirm — Send ${amount} ${selectedCoin.symbol}`}
              </button>
              <button onClick={() => setScreen('amount')} className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ===== DONE SCREEN ===== */}
        {screen === 'done' && foundUser && selectedCoin && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#0ECB81]/15 flex items-center justify-center mb-5">
              <CheckCircle className="w-10 h-10 text-[#0ECB81]" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Transfer Complete!</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              <strong className="text-white">{amount} {selectedCoin.symbol}</strong> has been sent to <strong className="text-white">{foundUser.username}</strong>.
            </p>
            <div className="bg-[#12151C] rounded-2xl p-4 border border-[#1C1F27] w-full mb-6 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Recipient</span>
                <span className="text-white font-semibold">{foundUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Sent</span>
                <span className="text-[#F0B90B] font-bold">{amount} {selectedCoin.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee</span>
                <span className="text-[#0ECB81] font-semibold">Free</span>
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
