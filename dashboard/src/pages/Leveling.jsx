import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function Leveling({ selectedGuild, user }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    enabled: true,
    announceChannel: '',
    ignoredChannels: [],
    xpRate: 1.0,
    noExtraXpForPremium: false
  });
  const [defaultCardSettings, setDefaultCardSettings] = useState({
    mainColor: '#00FFFF',
    backgroundColor: '#23272A',
    backgroundImage: '',
    overlayOpacity: 0.6,
    font: 'Montserrat'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalTab, setModalTab] = useState('customize'); // 'customize' or 'visibility'

  const guildId = selectedGuild?.id;
  const userId = user?.id || 'default';

  // Predefined color palette
  const colorPalette = [
    '#00FFFF', '#FFFFFF', '#7B8A8E', '#FF6B6B', '#FFA500', '#FFD700', '#00FF00', '#00FFFF', '#0099FF', '#6666FF', '#FF00FF'
  ];

  // Predefined backgrounds
  const backgroundPresets = [
    { id: 'empty', label: 'Empty background', color: '#23272A' },
    { id: 'dark1', label: 'Dark 1', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80' },
    { id: 'forest', label: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80' },
    { id: 'ocean', label: 'Ocean', url: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&q=80' },
    { id: 'sunset', label: 'Sunset', url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80' },
    { id: 'night', label: 'Night', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4b4bf?w=800&q=80' },
  ];

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

  const fetchDefaultCardSettings = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/leveling/${guildId}/card-settings/default`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) {
        setDefaultCardSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.error('Failed to fetch default card settings:', err);
    }
  }, [guildId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchDefaultCardSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConfig, fetchDefaultCardSettings]);

  useEffect(() => {
    if (guildId) {
      const settingsStr = encodeURIComponent(JSON.stringify(defaultCardSettings));
      // Use the actual logged-in user's ID for the preview to show their rank/avatar
      setPreviewUrl(`/api/leveling/${guildId}/card-preview/${userId}?settings=${settingsStr}&t=${Date.now()}`);
    }
  }, [defaultCardSettings, guildId, userId]);

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

  const handleSaveDefaultCard = async () => {
    setSaving(true);
    try {
      await fetch(`/api/leveling/${guildId}/card-settings/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultCardSettings),
        credentials: 'include'
      });
      setShowEditModal(false);
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

  const xpRateLabels = {
    0.25: 'x0.25',
    0.5: 'x0.5',
    0.75: 'x0.75',
    1: 'x1',
    1.5: 'x1.5',
    2: 'x2',
    2.5: 'x2.5',
    3: 'x3'
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tight">Leveling <span className="gradient-text">System</span></h1>
        <p className="text-slate-400 mt-1">Manage your server's leveling and customize the default rank card.</p>
      </header>

      {/* Default Server Rank Card Section */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
            Default server rank card
          </h2>
          <p className="text-sm text-slate-400">You can customize the default rank card in your server. By default, every member of your server will have that rank card.</p>
        </div>

        {/* Card Preview */}
        <div className="relative w-full max-w-[536px] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10 min-h-[160px] flex items-center justify-center">
          {previewUrl ? (
            <img src={previewUrl} alt="Rank Card Preview" className="w-full h-auto object-contain" onError={(e) => e.target.src = 'https://via.placeholder.com/934x282/1a1a1a/ffffff?text=Rank+Card+Preview'} />
          ) : (
            <div className="text-slate-500">Loading preview...</div>
          )}
        </div>

        {/* Edit Button */}
        <button 
          onClick={() => setShowEditModal(true)}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          Edit server rank card
        </button>
      </div>

      {/* XP Rate Section */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <span className="text-2xl">👑</span>
            XP Rate
          </h2>
          <p className="text-sm text-slate-400">Change the leveling difficulty by tweaking the rate at which your members will gain XP.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(xpRateLabels).map(([rate, label]) => (
                <button
                  key={rate}
                  onClick={() => setConfig({ ...config, xpRate: parseFloat(rate) })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    config.xpRate === parseFloat(rate)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <input 
            type="range" 
            min="0.25" 
            max="3" 
            step="0.25"
            value={config.xpRate} 
            onChange={(e) => setConfig({ ...config, xpRate: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
            <input 
              type="checkbox" 
              id="noExtraXp"
              checked={config.noExtraXpForPremium}
              onChange={(e) => setConfig({ ...config, noExtraXpForPremium: e.target.checked })}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="noExtraXp" className="text-sm text-slate-300 cursor-pointer">
              Do not give extra XP to Nexus Pro subscribers
            </label>
          </div>
        </div>

        <button 
          onClick={handleSaveConfig}
          disabled={saving}
          className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900">
              <h2 className="text-xl font-bold text-white">Edit Rank Card</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6">
              <button
                onClick={() => setModalTab('customize')}
                className={`px-6 py-4 font-bold text-sm transition-all ${
                  modalTab === 'customize'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                Customize
              </button>
              <button
                onClick={() => setModalTab('visibility')}
                className={`px-6 py-4 font-bold text-sm transition-all ${
                  modalTab === 'visibility'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                Visibility
              </button>
            </div>

            <div className="p-6 space-y-6">
              {modalTab === 'customize' ? (
                <>
                  {/* Live Preview */}
                  <div className="space-y-3">
                    <div className="relative w-full max-w-[536px] rounded-xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10 min-h-[160px] flex items-center justify-center">
                      <img src={previewUrl} alt="Rank Card Preview" className="w-full h-auto object-contain" onError={(e) => e.target.src = 'https://via.placeholder.com/934x282/1a1a1a/ffffff?text=Rank+Card+Preview'} />
                    </div>
                  </div>

                  {/* Background Controls */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button className="flex-1 px-4 py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 font-bold rounded-lg transition-all border border-amber-500/30 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Unlock all backgrounds
                      </button>
                      <button className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all">
                        Upload custom background
                      </button>
                    </div>
                  </div>

                  {/* Colors Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-slate-400">Colors</label>
                      <label className="text-sm font-bold text-slate-400">Overlay opacity</label>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-2 flex-wrap flex-1">
                        {colorPalette.map((color) => (
                          <button
                            key={color}
                            onClick={() => setDefaultCardSettings({ ...defaultCardSettings, mainColor: color })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              defaultCardSettings.mainColor === color
                                ? 'border-white scale-110'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1"
                          value={defaultCardSettings.overlayOpacity} 
                          onChange={(e) => setDefaultCardSettings({ ...defaultCardSettings, overlayOpacity: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Background Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                      Custom Background
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {backgroundPresets.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setDefaultCardSettings({ ...defaultCardSettings, backgroundImage: bg.url || '' })}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            (defaultCardSettings.backgroundImage === bg.url || (bg.id === 'empty' && !defaultCardSettings.backgroundImage))
                              ? 'border-blue-500 scale-105'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                          style={bg.color ? { backgroundColor: bg.color } : { backgroundImage: `url(${bg.url})`, backgroundSize: 'cover' }}
                          title={bg.label}
                        >
                          {bg.id === 'empty' && (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold">
                              Empty
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm">Visibility settings coming soon...</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSaveDefaultCard}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
