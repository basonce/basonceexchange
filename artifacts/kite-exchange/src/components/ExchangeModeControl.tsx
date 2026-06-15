import { useState, useEffect, useCallback } from 'react';
import { Snowflake, Power, RefreshCw, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { PriceCache } from '../lib/price-cache';

interface ModeConfig {
  mode: 'live' | 'frozen';
  frozen_at: string | null;
  frozen_prices: Record<string, any>;
  activated_by: string | null;
  updated_at: string;
}

interface ExchangeModeControlProps {
  compact?: boolean;
}

const TOP_COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'TRX', 'DOT'];

export default function ExchangeModeControl({ compact = false }: ExchangeModeControlProps) {
  const [config, setConfig] = useState<ModeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [snapshotPreview, setSnapshotPreview] = useState<Record<string, number>>({});

  const loadConfig = useCallback(async () => {
    const { data } = await supabase
      .from('exchange_mode_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (data) setConfig(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();

    const channel = supabase
      .channel('admin_exchange_mode')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exchange_mode_config' }, (payload) => {
        setConfig(payload.new as ModeConfig);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConfig]);

  useEffect(() => {
    const cache = PriceCache.getInstance();
    const updatePreview = () => {
      const preview: Record<string, number> = {};
      for (const sym of TOP_COINS) {
        const cached = cache.getBySymbol(sym);
        if (cached) preview[sym] = cached.price;
      }
      setSnapshotPreview(preview);
    };

    updatePreview();
    const unsub = cache.subscribe(updatePreview);
    return () => unsub();
  }, []);

  const handleFreeze = async () => {
    setSaving(true);
    try {
      const cache = PriceCache.getInstance();
      const snapshot = cache.snapshotCurrentPrices();

      const { error } = await supabase
        .from('exchange_mode_config')
        .update({
          mode: 'frozen',
          frozen_at: new Date().toISOString(),
          frozen_prices: snapshot,
          activated_by: (await getCurrentUser())?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
    } catch (err) {
      console.error('Freeze failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('exchange_mode_config')
        .update({
          mode: 'live',
          frozen_at: null,
          frozen_prices: {},
          activated_by: (await getCurrentUser())?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
    } catch (err) {
      console.error('Release failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const frozenAt = config?.frozen_at
    ? new Date(config.frozen_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const frozenDate = config?.frozen_at
    ? new Date(config.frozen_at).toLocaleDateString('tr-TR')
    : null;

  const isFrozen = config?.mode === 'frozen';

  if (loading) {
    return (
      <div className="bg-[#1E2329] rounded-xl p-4 border border-[#2B3139] animate-pulse">
        <div className="h-4 bg-[#2B3139] rounded w-32 mb-3" />
        <div className="h-10 bg-[#2B3139] rounded" />
      </div>
    );
  }

  return (
    <div className={`bg-[#1E2329] rounded-xl border ${isFrozen ? 'border-blue-500/40' : 'border-[#2B3139]'} overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isFrozen ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
            {isFrozen
              ? <Snowflake size={18} className="text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
              : <Activity size={18} className="text-emerald-400" />
            }
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold">Borsa Modu</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFrozen ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {isFrozen ? 'FROZEN' : 'LIVE'}
              </span>
            </div>
            {isFrozen && frozenAt && (
              <span className="text-[#8a9bb0] text-xs">{frozenDate} {frozenAt} itibaren donduruldu</span>
            )}
            {!isFrozen && (
              <span className="text-[#8a9bb0] text-xs">Canli fiyatlar aktif</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[#5E6673]" /> : <ChevronDown size={16} className="text-[#5E6673]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 border-2 transition-all ${!isFrozen ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#2B3139] bg-[#161A1E]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${!isFrozen ? 'bg-emerald-400 animate-pulse' : 'bg-[#5E6673]'}`} />
                <span className={`text-xs font-bold ${!isFrozen ? 'text-emerald-300' : 'text-[#5E6673]'}`}>LIVE</span>
              </div>
              <p className="text-[#8a9bb0] text-[10px]">Binance canli fiyatlar, gercek grafikler</p>
            </div>

            <div className={`rounded-xl p-3 border-2 transition-all ${isFrozen ? 'border-blue-500 bg-blue-500/10' : 'border-[#2B3139] bg-[#161A1E]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Snowflake size={10} className={isFrozen ? 'text-blue-400' : 'text-[#5E6673]'} />
                <span className={`text-xs font-bold ${isFrozen ? 'text-blue-300' : 'text-[#5E6673]'}`}>FROZEN</span>
              </div>
              <p className="text-[#8a9bb0] text-[10px]">Fiyatlar dondurulur, grafik sabit kalir</p>
            </div>
          </div>

          {!isFrozen && (
            <div className="bg-[#161A1E] rounded-xl p-3 border border-[#2B3139]">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity size={11} className="text-[#848E9C]" />
                <span className="text-[#848E9C] text-[11px] font-medium">Canli Fiyat Onizleme</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TOP_COINS.slice(0, 10).map(sym => (
                  <div key={sym} className="text-center">
                    <div className="text-[#8a9bb0] text-[9px]">{sym}</div>
                    <div className="text-white text-[10px] font-mono font-medium">
                      {snapshotPreview[sym] ? (snapshotPreview[sym] >= 1000
                        ? `$${(snapshotPreview[sym] / 1000).toFixed(1)}k`
                        : `$${snapshotPreview[sym].toFixed(snapshotPreview[sym] >= 1 ? 1 : 4)}`)
                        : '--'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFrozen && config?.frozen_prices && Object.keys(config.frozen_prices).length > 0 && (
            <div className="bg-[#0d1f2d] rounded-xl p-3 border border-blue-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Snowflake size={11} className="text-blue-400" />
                <span className="text-blue-300 text-[11px] font-medium">Dondurulmus Fiyatlar</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TOP_COINS.slice(0, 10).map(sym => {
                  const frozenPrice = config.frozen_prices[sym]?.price;
                  return (
                    <div key={sym} className="text-center">
                      <div className="text-blue-400/60 text-[9px]">{sym}</div>
                      <div className="text-blue-200 text-[10px] font-mono font-medium">
                        {frozenPrice ? (frozenPrice >= 1000
                          ? `$${(frozenPrice / 1000).toFixed(1)}k`
                          : `$${frozenPrice.toFixed(frozenPrice >= 1 ? 1 : 4)}`)
                          : '--'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isFrozen ? (
              <button
                onClick={handleFreeze}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-95"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Snowflake size={15} />
                )}
                {saving ? 'Dondurulyor...' : 'Fiyatlari Dondur'}
              </button>
            ) : (
              <button
                onClick={handleRelease}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-95"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Activity size={15} />
                )}
                {saving ? 'Serbest birakiliyor...' : 'Canli Fiyatlara Don'}
              </button>
            )}

            <button
              onClick={loadConfig}
              className="w-11 h-11 flex items-center justify-center bg-[#161A1E] hover:bg-[#2B3139] rounded-xl transition-colors border border-[#2B3139]"
            >
              <RefreshCw size={14} className="text-[#848E9C]" />
            </button>
          </div>

          <p className="text-[#5E6673] text-[10px] text-center leading-relaxed">
            Dondurulunca tum kullanicilar icin fiyatlar, grafik, trade ve futures anlık donacak.<br />
            Serbest birakildiginda gercek fiyatlara anında donulur.
          </p>
        </div>
      )}
    </div>
  );
}
