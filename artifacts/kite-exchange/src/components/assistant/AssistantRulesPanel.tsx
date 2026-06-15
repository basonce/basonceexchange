import { useState, useEffect } from 'react';
import { Shield, Plus, ToggleLeft, ToggleRight, Trash2, Loader2, RefreshCw, Activity, Bot, X, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  priority: number;
  execution_count: number;
  last_executed_at: string | null;
  trigger_condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

const CATEGORY_COLORS: Record<string, string> = {
  financial: 'text-emerald-400 bg-emerald-500/10',
  security: 'text-red-400 bg-red-500/10',
  user: 'text-blue-400 bg-blue-500/10',
  trading: 'text-amber-400 bg-amber-500/10',
  mining: 'text-violet-400 bg-violet-500/10',
  support: 'text-cyan-400 bg-cyan-500/10',
  social: 'text-pink-400 bg-pink-500/10',
  system: 'text-gray-400 bg-gray-500/10',
};

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'Finansal',
  security: 'Guvenlik',
  user: 'Kullanici',
  trading: 'Trading',
  mining: 'Mining',
  support: 'Destek',
  social: 'Sosyal',
  system: 'Sistem',
};

const PRESET_RULES = [
  {
    name: 'Yuksek Kaldirac Uyarisi',
    description: '75x veya uzeri kaldiracli pozisyon acildiginda otomatik uyari gonder',
    category: 'trading',
    priority: 90,
    trigger_condition: { type: 'position_leverage', threshold: 75 },
    action: { type: 'create_alert', priority: 'high' },
  },
  {
    name: 'Buyuk Cekim Onay Gerektir',
    description: '$10,000 uzeri cekimler manuel onay beklesin',
    category: 'financial',
    priority: 85,
    trigger_condition: { type: 'withdrawal_amount', threshold: 10000 },
    action: { type: 'require_manual_approval' },
  },
  {
    name: 'Sifir Deposit Cekim Engeli',
    description: 'Hic deposit yapmadan cekim talebinde bulunan kullanicilari fraud ile isaretle',
    category: 'security',
    priority: 95,
    trigger_condition: { type: 'zero_deposit_withdrawal' },
    action: { type: 'flag_fraud', risk_score: 85 },
  },
  {
    name: 'Yeni Kullanici Bonus',
    description: 'Ilk deposit yapan kullaniciya otomatik $5 bonus ver',
    category: 'financial',
    priority: 70,
    trigger_condition: { type: 'first_deposit' },
    action: { type: 'credit_bonus', amount: 5, symbol: 'USDT' },
  },
  {
    name: '4 Saat Cevapsiz Bilet Alarmi',
    description: '4 saatten uzun suredir cevap verilmeyen biletler icin uyari olustur',
    category: 'support',
    priority: 80,
    trigger_condition: { type: 'ticket_unanswered', hours: 4 },
    action: { type: 'create_alert', priority: 'medium' },
  },
  {
    name: 'Likidasyona Yakin Uyari',
    description: 'Likidasyon fiyatina %5 yaklasan pozisyonlara uyari gonder',
    category: 'trading',
    priority: 88,
    trigger_condition: { type: 'near_liquidation', threshold_pct: 5 },
    action: { type: 'create_alert', priority: 'high' },
  },
];

export default function AssistantRulesPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'financial',
    priority: 50,
  });

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    const { data } = await supabase
      .from('assistant_rules')
      .select('*')
      .order('priority', { ascending: false });
    setRules(data || []);
    setLoading(false);
  }

  async function toggleRule(id: string, currentState: boolean) {
    setToggling(id);
    await supabase.from('assistant_rules').update({ is_active: !currentState }).eq('id', id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentState } : r));
    setToggling(null);
  }

  async function deleteRule(id: string) {
    if (!confirm('Bu kurali silmek istediginizden emin misiniz?')) return;
    await supabase.from('assistant_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
  }

  async function saveRule() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('assistant_rules').insert({
      name: form.name,
      description: form.description,
      category: form.category,
      priority: form.priority,
      is_active: true,
      execution_count: 0,
      trigger_condition: {},
      action: {},
    }).select().single();

    if (!error && data) {
      setRules(prev => [data, ...prev]);
      setForm({ name: '', description: '', category: 'financial', priority: 50 });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function addPresetRule(preset: typeof PRESET_RULES[0]) {
    setSaving(true);
    const { data, error } = await supabase.from('assistant_rules').insert({
      ...preset,
      is_active: true,
      execution_count: 0,
    }).select().single();

    if (!error && data) {
      setRules(prev => [data, ...prev]);
    }
    setSaving(false);
  }

  const categories = ['all', ...Array.from(new Set(rules.map(r => r.category)))];
  const filtered = filter === 'all' ? rules : rules.filter(r => r.category === filter);
  const activeCount = rules.filter(r => r.is_active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Kural Motoru</span>
          <span className="text-xs bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-md">
            {activeCount}/{rules.length} aktif
          </span>
        </div>
        <button
          onClick={loadRules}
          className="p-1.5 rounded-lg hover:bg-[#2B3139] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === cat
                ? 'bg-[#F0B90B] text-[#181A20]'
                : 'bg-[#2B3139] text-gray-400 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'Tumu' : CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#1E2329] border border-[#F0B90B]/30 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">Yeni Kural</span>
            <button onClick={() => setShowForm(false)} className="p-0.5 hover:bg-[#2B3139] rounded transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Kural adi"
            className="w-full bg-[#2B3139] border border-[#363C45] rounded-lg px-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#F0B90B]/50"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Aciklama (ne zaman devreye girer?)"
            rows={2}
            className="w-full bg-[#2B3139] border border-[#363C45] rounded-lg px-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#F0B90B]/50 resize-none"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Kategori</label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-[#2B3139] border border-[#363C45] rounded-lg px-3 py-2 text-white text-xs appearance-none focus:outline-none focus:border-[#F0B90B]/50"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-500 mb-1 block">Oncelik (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))}
                className="w-full bg-[#2B3139] border border-[#363C45] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#F0B90B]/50"
              />
            </div>
          </div>
          <button
            onClick={saveRule}
            disabled={saving || !form.name.trim()}
            className="w-full bg-[#F0B90B] text-[#181A20] rounded-lg py-2 text-xs font-bold hover:bg-[#d4a20a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Kaydet
          </button>
        </div>
      )}

      {showPresets && (
        <div className="bg-[#1E2329] border border-[#2B3139] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white">Hazir Kurallar</span>
            <button onClick={() => setShowPresets(false)} className="p-0.5 hover:bg-[#2B3139] rounded transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          {PRESET_RULES.map(preset => (
            <div key={preset.name} className="flex items-start justify-between gap-2 p-2 bg-[#2B3139] rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{preset.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{preset.description}</p>
              </div>
              <button
                onClick={() => addPresetRule(preset)}
                disabled={saving}
                className="flex-shrink-0 text-[10px] bg-[#F0B90B]/10 border border-[#F0B90B]/30 text-[#F0B90B] px-2 py-1 rounded-lg hover:bg-[#F0B90B]/20 transition-colors disabled:opacity-50"
              >
                Ekle
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-[#F0B90B] animate-spin" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Kural bulunamadi</p>
            </div>
          ) : filtered.map(rule => (
            <div
              key={rule.id}
              className={`rounded-xl border p-3 transition-all ${
                rule.is_active
                  ? 'border-[#2B3139] bg-[#1E2329]'
                  : 'border-[#1E2329] bg-[#181A20] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-white leading-tight">{rule.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[rule.category] || 'text-gray-400 bg-gray-500/10'}`}>
                      {CATEGORY_LABELS[rule.category] || rule.category}
                    </span>
                    <span className="text-xs text-gray-600">P:{rule.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{rule.description}</p>
                  {rule.execution_count > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Activity className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-gray-600">{rule.execution_count} kez calistirildi</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleRule(rule.id, rule.is_active)}
                    disabled={toggling === rule.id}
                    className="p-1 rounded-lg hover:bg-[#2B3139] transition-colors"
                  >
                    {toggling === rule.id
                      ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      : rule.is_active
                        ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                        : <ToggleLeft className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => { setShowPresets(!showPresets); setShowForm(false); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[#2B3139] rounded-xl text-xs text-gray-500 hover:text-amber-400 hover:border-amber-400/30 transition-all"
        >
          <Bot className="w-3.5 h-3.5" />
          Hazir Kurallar
        </button>
        <button
          onClick={() => { setShowForm(!showForm); setShowPresets(false); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[#2B3139] rounded-xl text-xs text-gray-500 hover:text-white hover:border-[#F0B90B]/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Yeni Kural
        </button>
      </div>
    </div>
  );
}
