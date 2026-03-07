import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function Leveling({ selectedGuild }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    enabled: true,
    announceChannel: '',
    ignoredChannels: []
  });
  const [cardSettings, setCardSettings] = useState({
    mainColor: '#00FFFF',
    backgroundColor: '#23272A',
    backgroundImage: '',
    overlayOpacity: 0.6,
    font: 'Montserrat'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'card'

  const guildId = selectedGuild?.id;
  const userId = JSON.parse(sessionStorage.getItem('user'))?.id;

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/leveling/${guildId}/config`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setConfig(data.data);
    } catch (err) {
      console.error('Failed to fetch leveling config:', err);
    }
  }, [guildId]);

  const fetchCardSettings = useCallback(async () => {
    if (!guildId || !userId) return;
    try {
      const res = await fetch(`/api/leveling/${guildId}/card-settings/${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setCardSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.error('Failed to fetch card settings:', err);
    }
  }, [guildId, userId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchCardSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConfig, fetchCardSettings]);

  useEffect(() => {
    if (guildId && userId) {
      const settingsStr = encodeURIComponent(JSON.stringify(cardSettings));
      setPreviewUrl(`/api/leveling/${guildId}/card-preview/${userId}?settings=${settingsStr}&t=${Date.now()}`);
    }
  }, [cardSettings, guildId, userId]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await fetch(`/api/leveling/${guildId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async () => {
    setSaving(true);
    try {
      await fetch(`/api/leveling/${guildId}/card-settings/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardSettings),
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to save card settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight">Leveling <span className="gradient-text">System</span></h1>
        <p className="text-slate-400 mt-1">Configure XP rewards and customize your personal rank card.</p>
      </header>

      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          System Settings
        </button>
        <button 
          onClick={() => setActiveTab('card')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'card' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          Rank Card Designer
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="glass rounded-3xl p-6 md:p-8 space-y-8 border border-white/5">
          <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <h3 className="text-lg font-bold text-white">Enable Leveling</h3>
              <p className="text-sm text-slate-400">Allow members to earn XP by chatting.</p>
            </div>
            <button 
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`w-14 h-8 rounded-full transition-all relative ${config.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${config.enabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Announcement Channel</label>
              <input 
                type="text" 
                value={config.announceChannel || ''} 
                onChange={(e) => setConfig({ ...config, announceChannel: e.target.value })}
                placeholder="Channel ID (leave empty for current channel)"
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Preview Section */}
          <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Live Preview
            </h3>
            <div className="relative aspect-[934/282] w-full max-w-[934px] mx-auto rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10">
              <img src={previewUrl} alt="Rank Card Preview" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Customization Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
              <h3 className="text-lg font-bold text-white">Colors & Appearance</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Main Accent Color</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color" 
                      value={cardSettings.mainColor} 
                      onChange={(e) => setCardSettings({ ...cardSettings, mainColor: e.target.value })}
                      className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={cardSettings.mainColor} 
                      onChange={(e) => setCardSettings({ ...cardSettings, mainColor: e.target.value })}
                      className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Background Color</label>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="color" 
                      value={cardSettings.backgroundColor} 
                      onChange={(e) => setCardSettings({ ...cardSettings, backgroundColor: e.target.value })}
                      className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={cardSettings.backgroundColor} 
                      onChange={(e) => setCardSettings({ ...cardSettings, backgroundColor: e.target.value })}
                      className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
              <h3 className="text-lg font-bold text-white">Background Image</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Image URL</label>
                  <input 
                    type="text" 
                    value={cardSettings.backgroundImage || ''} 
                    onChange={(e) => setCardSettings({ ...cardSettings, backgroundImage: e.target.value })}
                    placeholder="https://example.com/image.png"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Overlay Opacity</label>
                    <span className="text-white font-bold">{Math.round(cardSettings.overlayOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    value={cardSettings.overlayOpacity} 
                    onChange={(e) => setCardSettings({ ...cardSettings, overlayOpacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Font Style</label>
                  <select 
                    value={cardSettings.font}
                    onChange={(e) => setCardSettings({ ...cardSettings, font: e.target.value })}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                  >
                    <option value="Montserrat">Montserrat (Default)</option>
                    <option value="sans-serif">Sans-Serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button 
              onClick={handleSaveCard}
              disabled={saving}
              className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Rank Card Design'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
