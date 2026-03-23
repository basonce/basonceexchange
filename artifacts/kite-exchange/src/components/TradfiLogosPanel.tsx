import { useState, useEffect, useRef } from 'react';
import { Save, X, Search, Image, CheckCircle, AlertCircle, Trash2, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getBaseAssets } from '../lib/global-markets-data';

interface TradfiLogo {
  id: string;
  symbol: string;
  logo_url: string;
  updated_at: string;
}

interface AssetRow {
  symbol: string;
  displayName: string;
  name: string;
  category: string;
  logo_url: string;
  saved: boolean;
  dirty: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  indices: 'Indices',
  stocks: 'Stocks',
  metals: 'Metals',
  energy: 'Energy',
  agriculture: 'Agriculture',
  forex: 'Forex',
};

const CATEGORY_COLORS: Record<string, string> = {
  indices: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  stocks: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  metals: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  energy: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  agriculture: 'bg-green-500/20 text-green-400 border-green-500/30',
  forex: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

export default function TradfiLogosPanel() {
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [previewSymbol, setPreviewSymbol] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const assets = getBaseAssets();
    const { data: logos } = await supabase.from('tradfi_logos').select('*');
    const logoMap: Record<string, string> = {};
    logos?.forEach(l => { logoMap[l.symbol] = l.logo_url; });

    setRows(assets.map(a => ({
      symbol: a.symbol,
      displayName: a.displayName,
      name: a.name,
      category: a.category,
      logo_url: logoMap[a.symbol] || '',
      saved: !!logoMap[a.symbol],
      dirty: false,
    })));
  };

  const handleChange = (symbol: string, value: string) => {
    setRows(prev => prev.map(r => r.symbol === symbol ? { ...r, logo_url: value, dirty: true } : r));
    setPreviewErr(prev => ({ ...prev, [symbol]: false }));
  };

  const handleSave = async (symbol: string) => {
    const row = rows.find(r => r.symbol === symbol);
    if (!row) return;
    setSaving(prev => ({ ...prev, [symbol]: true }));
    try {
      const { data: existing } = await supabase
        .from('tradfi_logos')
        .select('id')
        .eq('symbol', symbol)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('tradfi_logos').update({
          logo_url: row.logo_url,
          updated_at: new Date().toISOString(),
        }).eq('symbol', symbol);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tradfi_logos').insert({
          symbol,
          logo_url: row.logo_url,
        });
        if (error) throw error;
      }
      setRows(prev => prev.map(r => r.symbol === symbol ? { ...r, saved: !!row.logo_url, dirty: false } : r));
      showToast(`${symbol} kaydedildi`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Hata';
      showToast(`Hata: ${msg}`, false);
    } finally {
      setSaving(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleDelete = async (symbol: string) => {
    setSaving(prev => ({ ...prev, [symbol]: true }));
    try {
      const { error } = await supabase.from('tradfi_logos').delete().eq('symbol', symbol);
      if (error) throw error;
      setRows(prev => prev.map(r => r.symbol === symbol ? { ...r, logo_url: '', saved: false, dirty: false } : r));
      showToast(`${symbol} silindi`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Hata';
      showToast(`Silme hatasi: ${msg}`, false);
    } finally {
      setSaving(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleFileUpload = async (symbol: string, file: File) => {
    setUploading(prev => ({ ...prev, [symbol]: true }));
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${symbol.toLowerCase()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('tradfi-logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('tradfi-logos').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      setRows(prev => prev.map(r => r.symbol === symbol ? { ...r, logo_url: publicUrl, dirty: true } : r));
      setPreviewErr(prev => ({ ...prev, [symbol]: false }));
      showToast(`${symbol} fotograf yuklendi, Kaydet'e basin`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Hata';
      showToast(`Yukleme hatasi: ${msg}`, false);
    } finally {
      setUploading(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleSaveAll = async () => {
    const dirtyRows = rows.filter(r => r.dirty && r.logo_url);
    if (!dirtyRows.length) { showToast('Degisiklik yok'); return; }
    for (const row of dirtyRows) {
      await handleSave(row.symbol);
    }
    showToast(`${dirtyRows.length} logo kaydedildi`);
  };

  const filtered = rows.filter(r => {
    const matchSearch = r.symbol.toLowerCase().includes(search.toLowerCase()) ||
      r.displayName.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || r.category === filterCat;
    return matchSearch && matchCat;
  });

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)];
  const savedCount = rows.filter(r => r.saved).length;
  const dirtyCount = rows.filter(r => r.dirty).length;

  return (
    <div className="p-4 space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">TradeFi Logo Yoneticisi</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {savedCount} / {rows.length} logolu &nbsp;·&nbsp;
              {dirtyCount > 0 && <span className="text-orange-500 font-medium">{dirtyCount} kaydedilmedi</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yenile
            </button>
            {dirtyCount > 0 && (
              <button
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Tümünü Kaydet ({dirtyCount})
              </button>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-4">
          <strong>Nasil kullanilir:</strong> Logo URL'sini kutuya yaz, <strong>Kaydet</strong> butonuna bas. Resim URL'si olmayanlarda varsayilan ikon gösterilir.
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterCat === cat
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {cat === 'all' ? 'Tümü' : CATEGORY_LABELS[cat]}
              <span className="ml-1.5 text-[10px] opacity-60">
                ({cat === 'all' ? rows.length : rows.filter(r => r.category === cat).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sembol veya isim ara..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filtered.map(row => {
            const isSaving = saving[row.symbol];
            const showPreview = previewSymbol === row.symbol && row.logo_url && !previewErr[row.symbol];

            const isUploading = uploading[row.symbol];

            return (
              <div key={row.symbol} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200 bg-gray-50">
                  {row.logo_url && !previewErr[row.symbol] ? (
                    <img
                      src={row.logo_url}
                      alt={row.symbol}
                      className="w-8 h-8 object-contain"
                      onError={() => setPreviewErr(prev => ({ ...prev, [row.symbol]: true }))}
                    />
                  ) : (
                    <span className="text-[10px] font-black text-gray-400">{row.symbol.slice(0, 3)}</span>
                  )}
                </div>

                <div className="flex-shrink-0 w-32">
                  <p className="font-semibold text-gray-900 text-sm">{row.symbol}</p>
                  <p className="text-xs text-gray-500 truncate" style={{ maxWidth: 120 }}>{row.displayName}</p>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mt-0.5 ${CATEGORY_COLORS[row.category] || ''}`}>
                    {CATEGORY_LABELS[row.category]}
                  </span>
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      ref={el => { inputRefs.current[row.symbol] = el; }}
                      type="text"
                      value={row.logo_url}
                      onChange={e => handleChange(row.symbol, e.target.value)}
                      onFocus={() => setPreviewSymbol(row.symbol)}
                      onBlur={() => setPreviewSymbol(null)}
                      placeholder="https://example.com/logo.png veya fotograf yukle"
                      className={`w-full pl-9 pr-3 py-2 bg-gray-50 border rounded-lg text-xs focus:outline-none focus:ring-2 transition-colors ${
                        row.dirty
                          ? 'border-orange-300 focus:ring-orange-300/30'
                          : row.saved
                          ? 'border-green-300 focus:ring-green-300/30'
                          : 'border-gray-200 focus:ring-blue-500/30'
                      }`}
                    />
                    {row.dirty && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400" />
                    )}
                    {row.saved && !row.dirty && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-green-400" />
                    )}
                  </div>

                  {showPreview && (
                    <div className="w-8 h-8 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                      <img
                        src={row.logo_url}
                        alt=""
                        className="w-6 h-6 object-contain"
                        onError={() => setPreviewErr(prev => ({ ...prev, [row.symbol]: true }))}
                      />
                    </div>
                  )}

                  <input
                    ref={el => { fileRefs.current[row.symbol] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(row.symbol, file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[row.symbol]?.click()}
                    disabled={isSaving || isUploading}
                    title="Bilgisayardan fotograf yukle"
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {isUploading ? '' : 'Yukle'}
                  </button>

                  <button
                    onClick={() => handleSave(row.symbol)}
                    disabled={isSaving || isUploading || (!row.dirty && row.saved)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                      row.dirty
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : row.saved
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : row.saved && !row.dirty ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSaving ? '' : row.saved && !row.dirty ? 'Kayitli' : 'Kaydet'}
                  </button>

                  {row.saved && (
                    <button
                      onClick={() => handleDelete(row.symbol)}
                      disabled={isSaving || isUploading}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Logoyu sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <Image className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sonuc bulunamadi</p>
          </div>
        )}
      </div>
    </div>
  );
}
