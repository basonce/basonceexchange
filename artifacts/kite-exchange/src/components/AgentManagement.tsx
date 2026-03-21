import { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, RefreshCw, Search, X, Save,
  CheckCircle, AlertCircle, Users, Globe, Languages, Shield,
  Upload, Camera, ImagePlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Agent {
  id: string;
  name: string;
  country_code: string;
  country_name: string;
  avatar_url: string;
  status: string;
  languages: string[];
  specialty: string;
  created_at: string;
}

interface AgentForm {
  name: string;
  country_code: string;
  country_name: string;
  avatar_url: string;
  status: string;
  languages: string;
  specialty: string;
}

const EMPTY_FORM: AgentForm = {
  name: '',
  country_code: '',
  country_name: '',
  avatar_url: '',
  status: 'online',
  languages: 'en',
  specialty: 'general',
};

const SPECIALTIES = ['general', 'technical', 'billing', 'vip', 'trading', 'security'];
const STATUSES = ['online', 'offline', 'busy'];

const LOCAL_AVATARS = Array.from({ length: 50 }, (_, i) => `/ber${i + 1}.jpg`);

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [avatarTab, setAvatarTab] = useState<'upload' | 'gallery' | 'url'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_agents')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setAgents(data || []);
    } catch {
      showToast('error', 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const openAdd = () => {
    setEditingAgent(null);
    setForm(EMPTY_FORM);
    setAvatarTab('upload');
    setShowForm(true);
  };

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      country_code: agent.country_code,
      country_name: agent.country_name,
      avatar_url: agent.avatar_url,
      status: agent.status,
      languages: agent.languages.join(', '),
      specialty: agent.specialty,
    });
    setAvatarTab('upload');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAgent(null);
    setForm(EMPTY_FORM);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `agent-avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setForm(f => ({ ...f, avatar_url: urlData.publicUrl }));
      showToast('success', 'Photo uploaded successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      showToast('error', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.country_code.trim() || !form.country_name.trim()) {
      showToast('error', 'Name, country code and country name are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        country_code: form.country_code.trim().toUpperCase(),
        country_name: form.country_name.trim(),
        avatar_url: form.avatar_url.trim() || '/ber1.jpg',
        status: form.status,
        languages: form.languages.split(',').map(l => l.trim().toLowerCase()).filter(Boolean),
        specialty: form.specialty,
      };

      if (editingAgent) {
        const { error } = await supabase
          .from('support_agents')
          .update(payload)
          .eq('id', editingAgent.id);
        if (error) throw error;
        showToast('success', 'Agent updated successfully');
      } else {
        const { error } = await supabase
          .from('support_agents')
          .insert(payload);
        if (error) throw error;
        showToast('success', 'Agent added successfully');
      }

      closeForm();
      loadAgents();
    } catch {
      showToast('error', 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('support_agents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showToast('success', 'Agent deleted');
      setDeleteConfirm(null);
      loadAgents();
    } catch {
      showToast('error', 'Failed to delete agent');
    }
  };

  const filtered = agents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.country_name.toLowerCase().includes(search.toLowerCase()) ||
      a.specialty.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSpec = filterSpecialty === 'all' || a.specialty === filterSpecialty;
    return matchSearch && matchStatus && matchSpec;
  });

  const online = agents.filter(a => a.status === 'online').length;
  const countries = new Set(agents.map(a => a.country_code)).size;
  const langs = new Set(agents.flatMap(a => a.languages)).size;

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Agent Management</h2>
          <p className="text-sm text-gray-400">Add, edit and remove customer support representatives</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAgents}
            className="flex items-center gap-2 px-3 py-2 bg-[#2B3139] hover:bg-[#3B3F46] text-white rounded-lg transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#F0B90B] hover:bg-[#f8d12f] text-black font-semibold rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total Agents', value: agents.length, color: 'text-blue-400' },
          { icon: CheckCircle, label: 'Online', value: online, color: 'text-green-400' },
          { icon: Globe, label: 'Countries', value: countries, color: 'text-yellow-400' },
          { icon: Languages, label: 'Languages', value: langs, color: 'text-orange-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#181A20] border border-[#2B3139] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, country, specialty..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors placeholder-gray-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={filterSpecialty}
          onChange={e => setFilterSpecialty(e.target.value)}
          className="px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
        >
          <option value="all">All Specialties</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-[#F0B90B] animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(agent => (
            <div
              key={agent.id}
              className="bg-[#181A20] border border-[#2B3139] rounded-xl p-4 hover:border-[#F0B90B]/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={agent.avatar_url}
                      alt={agent.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#2B3139] group-hover:border-[#F0B90B]/40 transition-colors"
                      onError={e => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=F0B90B&color=181A20&size=100`;
                      }}
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181A20]
                      ${agent.status === 'online' ? 'bg-green-500' : agent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'}`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white leading-tight">{agent.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{agent.country_code} · {agent.country_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(agent)}
                    className="p-1.5 bg-[#2B3139] hover:bg-[#F0B90B]/20 hover:text-[#F0B90B] text-gray-400 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(agent.id)}
                    className="p-1.5 bg-[#2B3139] hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Specialty</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium
                    ${agent.specialty === 'vip' ? 'bg-yellow-500/20 text-yellow-400' :
                      agent.specialty === 'technical' ? 'bg-blue-500/20 text-blue-400' :
                      agent.specialty === 'billing' ? 'bg-green-500/20 text-green-400' :
                      agent.specialty === 'trading' ? 'bg-orange-500/20 text-orange-400' :
                      agent.specialty === 'security' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'}`}>
                    {agent.specialty}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Languages</span>
                  <span className="text-white">{agent.languages.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`${agent.status === 'online' ? 'text-green-400' : agent.status === 'busy' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500">
              <Shield className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No agents found</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2B3139]">
              <div>
                <h3 className="text-lg font-bold text-white">{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingAgent ? `Editing: ${editingAgent.name}` : 'Create a new support agent'}</p>
              </div>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Emma Johnson"
                    className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Country Code *</label>
                  <input
                    type="text"
                    value={form.country_code}
                    onChange={e => setForm(f => ({ ...f, country_code: e.target.value }))}
                    placeholder="US"
                    maxLength={3}
                    className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors placeholder-gray-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Country Name *</label>
                  <input
                    type="text"
                    value={form.country_name}
                    onChange={e => setForm(f => ({ ...f, country_name: e.target.value }))}
                    placeholder="United States"
                    className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Specialty</label>
                  <select
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
                  >
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Languages (comma separated)</label>
                  <input
                    type="text"
                    value={form.languages}
                    onChange={e => setForm(f => ({ ...f, languages: e.target.value }))}
                    placeholder="en, es, fr"
                    className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors placeholder-gray-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Profile Photo</label>

                  <div className="flex gap-1 mb-3 p-1 bg-[#181A20] rounded-lg border border-[#2B3139]">
                    {[
                      { key: 'upload', icon: Camera, label: 'Upload Photo' },
                      { key: 'gallery', icon: ImagePlus, label: 'Gallery' },
                      { key: 'url', icon: Upload, label: 'URL' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAvatarTab(tab.key as 'upload' | 'gallery' | 'url')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all
                          ${avatarTab === tab.key
                            ? 'bg-[#F0B90B] text-black'
                            : 'text-gray-400 hover:text-white'}`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {avatarTab === 'upload' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-[#2B3139] hover:border-[#F0B90B]/60 rounded-xl transition-all group disabled:opacity-50"
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="w-8 h-8 text-[#F0B90B] animate-spin" />
                            <span className="text-sm text-gray-400">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-14 h-14 rounded-full bg-[#F0B90B]/10 flex items-center justify-center group-hover:bg-[#F0B90B]/20 transition-colors">
                              <Camera className="w-7 h-7 text-[#F0B90B]" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-white">Tap to choose photo</p>
                              <p className="text-xs text-gray-500 mt-1">Camera or gallery · JPG, PNG · Max 5MB</p>
                            </div>
                          </>
                        )}
                      </button>
                      {form.avatar_url && (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-xs text-green-400 truncate">Photo set successfully</span>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, avatar_url: '' }))}
                            className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {avatarTab === 'gallery' && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Select from local photos:</p>
                      <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
                        {LOCAL_AVATARS.map(url => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, avatar_url: url }))}
                            className={`relative rounded overflow-hidden transition-all ${form.avatar_url === url ? 'ring-2 ring-[#F0B90B]' : 'opacity-60 hover:opacity-100'}`}
                          >
                            <img src={url} alt="" className="w-full aspect-square object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {avatarTab === 'url' && (
                    <input
                      type="text"
                      value={form.avatar_url}
                      onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full px-3 py-2.5 bg-[#181A20] border border-[#2B3139] text-white rounded-lg text-sm focus:outline-none focus:border-[#F0B90B] transition-colors placeholder-gray-600"
                    />
                  )}
                </div>
              </div>

              {form.avatar_url && (
                <div className="flex items-center gap-3 p-3 bg-[#181A20] border border-[#2B3139] rounded-lg">
                  <img
                    src={form.avatar_url}
                    alt="Preview"
                    className="w-12 h-12 rounded-full object-cover border border-[#2B3139]"
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || 'A')}&background=F0B90B&color=181A20&size=100`;
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{form.name || 'Preview'}</p>
                    <p className="text-xs text-gray-400">{form.specialty} · {form.status}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-[#2B3139]">
              <button
                onClick={closeForm}
                className="flex-1 px-4 py-2.5 bg-[#2B3139] hover:bg-[#3B3F46] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F0B90B] hover:bg-[#f8d12f] disabled:opacity-50 text-black rounded-lg text-sm font-semibold transition-colors"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingAgent ? 'Save Changes' : 'Add Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1E2329] border border-[#2B3139] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Agent</h3>
                <p className="text-xs text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Are you sure you want to delete <span className="text-white font-medium">{agents.find(a => a.id === deleteConfirm)?.name}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-[#2B3139] hover:bg-[#3B3F46] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
