import { useState, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Plus, Globe, MessageCircle, Gauge, Shield, Rocket, CheckCircle, Image as ImageIcon, Loader2, Coins, Gem } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const NETWORKS = [
  { id: 'BSC', label: 'BNC Chain', color: '#F0B90B', token: 'BNC', target: 1000 },
  { id: 'Ethereum', label: 'Ethereum', color: '#627EEA', token: 'ETH', target: 15 },
  { id: 'Solana', label: 'Solana', color: '#00D1FF', token: 'SOL', target: 200 },
  { id: 'Base', label: 'Base', color: '#0052FF', token: 'ETH', target: 8 },
];

const TAGS = [
  { id: 'Meme', label: 'Meme', color: '#F0B90B' },
  { id: 'AI', label: 'AI', color: '#00D1FF' },
  { id: 'Gaming', label: 'Gaming', color: '#0ECB81' },
  { id: 'DeFi', label: 'DeFi', color: '#E8831D' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTokenCreated?: (tokenId: string) => void;
}

export default function AlphaCreateToken({ isOpen, onClose, onTokenCreated }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [network, setNetwork] = useState('BSC');
  const [tag, setTag] = useState('Meme');
  const [antiSnipe, setAntiSnipe] = useState(true);
  const [initialBuy, setInitialBuy] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [launching, setLaunching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedNetwork = NETWORKS.find(n => n.id === network)!;

  const canProceed = () => {
    if (step === 1) return name.trim().length >= 2 && symbol.trim().length >= 2 && description.trim().length >= 10;
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;
    try {
      const ext = logoFile.name.split('.').pop() || 'png';
      const path = `tokens/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('alpha-logos').upload(path, logoFile);
      if (error) return null;
      const { data: urlData } = supabase.storage.from('alpha-logos').getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    setLaunching(true);
    const logoUrl = await uploadLogo();

    const initialBuyAmount = parseFloat(initialBuy) || 0;

    const { data, error } = await supabase.rpc('launch_alpha_token', {
      p_name: name.trim(),
      p_symbol: symbol.trim().toUpperCase(),
      p_description: description.trim(),
      p_logo_url: logoUrl,
      p_network: network,
      p_tag: tag,
      p_website_url: website || null,
      p_twitter_url: twitter || null,
      p_telegram_url: telegram || null,
      p_initial_buy: initialBuyAmount,
      p_raised_token: selectedNetwork.token,
      p_target_amount: selectedNetwork.target,
    });

    setLaunching(false);

    if (!error && data) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setStep(1);
        setName('');
        setSymbol('');
        setDescription('');
        setLogoPreview(null);
        setLogoFile(null);
        setWebsite('');
        setTwitter('');
        setTelegram('');
        setNetwork('BSC');
        setTag('Meme');
        setInitialBuy('');
        onClose();
        onTokenCreated?.(data as string);
      }, 2500);
    } else {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const TOTAL_STEPS = 5;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E11] overflow-y-auto">
      <div className="sticky top-0 bg-[#0B0E11]/95 backdrop-blur-sm z-10 px-4 py-3 flex items-center justify-between border-b border-[#2B3139]/50">
        <button onClick={onClose} className="p-1.5 hover:bg-[#2B3139] rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <span className="font-bold text-white text-sm">Launch Your Token</span>
        <div className="w-8" />
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-1 mb-5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${s <= step ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'}`} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-5 overflow-x-auto">
          {[
            { s: 1, label: 'Basics' },
            { s: 2, label: 'Links' },
            { s: 3, label: 'Settings' },
            { s: 4, label: 'Buy' },
            { s: 5, label: 'Preview' },
          ].map(({ s, label }) => (
            <div key={s} className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                s < step ? 'bg-[#0ECB81] text-white' : s === step ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-[#2B3139] text-gray-500'
              }`}>
                {s < step ? <CheckCircle className="w-3 h-3" /> : s}
              </div>
              <span className={`text-[10px] font-medium ${s === step ? 'text-white' : 'text-gray-500'}`}>{label}</span>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-[#0ECB81]/20 flex items-center justify-center mb-4 relative">
              <Rocket className="w-10 h-10 text-[#0ECB81]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#0ECB81]/30 animate-ping" />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Token Launched!</h3>
            <p className="text-gray-400 text-sm text-center">{name} (${symbol}) is now live on {network}</p>
            <div className="mt-4 flex items-center gap-2">
              <Gem className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-[#F0B90B] text-xs font-bold">Opening trading page...</span>
            </div>
          </div>
        ) : (
          <>
            {step === 1 && (
              <>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {logoPreview ? (
                      <div className="relative group">
                        <img src={logoPreview} alt="Token logo" className="w-[100px] h-[100px] rounded-xl object-cover border border-[#2B3139]" />
                        <button onClick={removeLogo} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#F6465D] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-[100px] h-[100px] rounded-xl border-2 border-dashed border-[#2B3139] bg-[#181A20] flex flex-col items-center justify-center gap-1.5 hover:border-[#F0B90B]/40 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/15 flex items-center justify-center">
                          <Plus className="w-5 h-5 text-[#F0B90B]" />
                        </div>
                        <div className="text-center">
                          <ImageIcon className="w-3.5 h-3.5 text-gray-500 mx-auto mb-0.5" />
                          <span className="text-gray-500 text-[8px] leading-tight block">PNG-JPEG-WEBP-GIF</span>
                          <span className="text-gray-600 text-[8px]">Max: 5MB</span>
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-gray-400 text-xs font-medium block mb-1">Token Name <span className="text-[#F6465D]">*</span></label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PepeCash" maxLength={32}
                        className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs font-medium block mb-1">Ticker Symbol <span className="text-[#F6465D]">*</span></label>
                      <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="e.g. PEPC" maxLength={10}
                        className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600" />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-gray-400 text-xs font-medium block mb-1">Description <span className="text-[#F6465D]">*</span></label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell the world about your token..." maxLength={500} rows={3}
                    className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600 resize-none" />
                  <span className="text-gray-600 text-[10px]">{description.length}/500</span>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs font-medium flex items-center gap-1 mb-1.5"><Globe className="w-3.5 h-3.5" /> Website</label>
                  <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium flex items-center gap-1 mb-1.5">Twitter</label>
                  <input type="url" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="https://x.com/..." className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium flex items-center gap-1 mb-1.5"><MessageCircle className="w-3.5 h-3.5" /> Telegram</label>
                  <input type="url" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="https://t.me/..." className="w-full bg-[#181A20] border border-[#2B3139] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-600" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-2">Blockchain Network</label>
                  <div className="grid grid-cols-2 gap-2">
                    {NETWORKS.map(n => (
                      <button key={n.id} onClick={() => setNetwork(n.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${network === n.id ? 'border-[#F0B90B] bg-[#F0B90B]/5' : 'border-[#2B3139] bg-[#181A20]'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: n.color }} />
                          <span className="text-white text-xs font-bold">{n.id}</span>
                        </div>
                        <span className="text-gray-500 text-[10px]">Target: {n.target} {n.token}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs font-medium block mb-2">Category Tag</label>
                  <div className="flex gap-2">
                    {TAGS.map(t => (
                      <button key={t.id} onClick={() => setTag(t.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tag === t.id ? 'text-[#0B0E11]' : 'bg-[#181A20] border border-[#2B3139] text-gray-400'}`}
                        style={tag === t.id ? { backgroundColor: t.color } : undefined}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B3139]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#F0B90B]" />
                      <div>
                        <span className="text-white text-xs font-bold block">Anti-Snipe Protection</span>
                        <span className="text-gray-500 text-[10px]">High fees for first few blocks</span>
                      </div>
                    </div>
                    <button onClick={() => setAntiSnipe(!antiSnipe)} className={`w-10 h-5 rounded-full transition-all ${antiSnipe ? 'bg-[#F0B90B]' : 'bg-[#2B3139]'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${antiSnipe ? 'ml-[22px]' : 'ml-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#F0B90B]/10 to-[#F0B90B]/5 rounded-xl p-4 border border-[#F0B90B]/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-5 h-5 text-[#F0B90B]" />
                    <span className="text-white font-bold text-sm">Initial Buy (Optional)</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                    Be the first buyer of your own token! This creates initial liquidity and shows confidence to other traders.
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      value={initialBuy}
                      onChange={e => setInitialBuy(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white text-lg font-bold outline-none focus:border-[#F0B90B]/50 transition-colors placeholder-gray-700 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">{selectedNetwork.token}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {(selectedNetwork.token === 'BNC' ? [1, 5, 10, 50, 100] : selectedNetwork.token === 'SOL' ? [0.5, 1, 5, 10, 50] : [0.01, 0.05, 0.1, 0.5, 1.0]).map(amt => (
                      <button
                        key={amt}
                        onClick={() => setInitialBuy(amt.toString())}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          initialBuy === amt.toString()
                            ? 'bg-[#F0B90B]/20 text-[#F0B90B] border border-[#F0B90B]/30'
                            : 'bg-[#0B0E11] text-gray-500 border border-[#2B3139]'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  {parseFloat(initialBuy) > 0 && (
                    <div className="mt-3 p-3 bg-[#0B0E11] rounded-xl space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-[11px]">You receive</span>
                        <span className="text-white text-xs font-bold">~{((parseFloat(initialBuy) || 0) / 0.000001).toLocaleString()} {symbol || 'TOKEN'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-[11px]">Initial MCap</span>
                        <span className="text-white text-xs font-bold">
                          ${((parseFloat(initialBuy) || 0) * (selectedNetwork.token === 'BNC' ? 600 : selectedNetwork.token === 'SOL' ? 150 : 3500)).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center text-gray-600 text-[11px]">
                  You can skip this step. Other users can still buy your token.
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="bg-[#181A20] rounded-xl p-4 border border-[#2B3139]/50">
                  <div className="flex items-center gap-3 mb-4">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#F0B90B]/15 flex items-center justify-center">
                        <span className="text-[#F0B90B] font-black text-base">{symbol.slice(0, 2) || '??'}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-white text-base font-bold block">{name || 'Token Name'}</span>
                      <span className="text-gray-500 text-xs">${symbol || 'SYMBOL'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Network</span><span className="text-xs font-bold" style={{ color: selectedNetwork.color }}>{selectedNetwork.id}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Category</span><span className="text-white text-xs font-bold">{tag}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Target Raise</span><span className="text-white text-xs font-bold">{selectedNetwork.target} {selectedNetwork.token}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500 text-xs">Anti-Snipe</span><span className={`text-xs font-bold ${antiSnipe ? 'text-[#0ECB81]' : 'text-gray-500'}`}>{antiSnipe ? 'Enabled' : 'Disabled'}</span></div>
                    {parseFloat(initialBuy) > 0 && (
                      <div className="flex justify-between"><span className="text-gray-500 text-xs">Initial Buy</span><span className="text-[#F0B90B] text-xs font-bold">{initialBuy} {selectedNetwork.token}</span></div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#2B3139]">
                    <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
                  </div>
                </div>
                <div className="bg-[#F0B90B]/10 rounded-xl p-3 border border-[#F0B90B]/20">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#F0B90B]" />
                    <span className="text-[#F0B90B] text-xs font-bold">Launch Fee: 0.005 {selectedNetwork.token}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#2B3139] text-gray-300 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button
                  onClick={() => canProceed() && setStep(step + 1)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                    canProceed() ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-[#2B3139] text-gray-600 cursor-not-allowed'
                  }`}>
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={launching}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] text-[#0B0E11] flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60">
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {launching ? 'Launching...' : 'Launch Token'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
