import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Settings({ selectedGuild }) {
  const { t } = useTranslation();
  
  const [settings, setSettings] = useState({
    autoRole: ''
  });
  const [guildData, setGuildData] = useState({ roles: [], channels: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentAutoRole, setCurrentAutoRole] = useState(null);

  // Customize Bot State
  const [customization, setCustomization] = useState({
    avatar: '',
    banner: '',
    bio: '» Help command **/help**\n» Setup command **/setup**\n» Debug command **/debug**\n» *Docs* https://tt.bot/docs\n» *Support* https://tt.bot/support\n» *Dashboard* https://tt.bot/dashboard'
  });
  const [isPremium, setIsPremium] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, guildDataRes, customRes, premiumRes] = await Promise.all([
          fetch('/api/dashboard/settings', { credentials: 'include' }),
          fetch('/api/dashboard/guild-data', { credentials: 'include' }),
          fetch('/api/dashboard/bot/customization', { credentials: 'include' }),
          fetch('/api/dashboard/premium/status', { credentials: 'include' })
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings({
            autoRole: data.autoRole || ''
          });
        }

        if (guildDataRes.ok) {
          const data = await guildDataRes.json();
          setGuildData(data);
        }

        if (customRes.ok) {
          const data = await customRes.json();
          if (data.bio || data.avatar || data.banner) {
            setCustomization(data);
          }
        }

        if (premiumRes.ok) {
          const data = await premiumRes.json();
          setIsPremium(data.isPremium);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedGuild?.id]);

  useEffect(() => {
    if (settings.autoRole && guildData.roles.length > 0) {
      const role = guildData.roles.find(r => r.id === settings.autoRole);
      if (role) {
        setCurrentAutoRole(role);
      }
    } else {
      setCurrentAutoRole(null);
    }
  }, [settings.autoRole, guildData.roles]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleCustomSave = async () => {
    if (!isPremium) return;
    setCustomSaving(true);
    try {
      const response = await fetch('/api/dashboard/bot/customization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(customization)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bot customization saved!' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save customization.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    } finally {
      setCustomSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const resetBio = () => {
    setCustomization({
      ...customization,
      bio: '» Help command **/help**\n» Setup command **/setup**\n» Debug command **/debug**\n» *Docs* https://tt.bot/docs\n» *Support* https://tt.bot/support\n» *Dashboard* https://tt.bot/dashboard'
    });
  };

  if (loading) return <div className="p-8 text-white">Loading settings...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Bot <span className="gradient-text">Settings</span></h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Configure core bot functionality and automation.</p>
      </header>

      {message.text && (
        <div className={`p-4 rounded-2xl border animate-in slide-in-from-top duration-300 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Customize Bot Section */}
        <section className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/5 space-y-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">Customize Bot</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Avatar Upload */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Avatar (1024x1024)</label>
              <div className="relative group">
                <div className="w-32 h-32 mx-auto rounded-full bg-slate-900 border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                  {customization.avatar ? (
                    <img src={customization.avatar} alt="Bot Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" />
                    </svg>
                  )}
                </div>
                {!isPremium && <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-[2px]"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>}
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={!isPremium}
                  onClick={() => {
                    const url = prompt('Enter image URL for avatar:');
                    if (url) setCustomization({...customization, avatar: url});
                  }}
                  className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm font-bold transition-all border border-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit
                </button>
                <button 
                  disabled={!isPremium}
                  onClick={() => setCustomization({...customization, avatar: ''})}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            {/* Banner Upload */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Banner (680x240)</label>
              <div className="relative group">
                <div className="w-full h-32 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
                  {customization.banner ? (
                    <img src={customization.banner} alt="Bot Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">NEXUS BOT</p>
                    </div>
                  )}
                </div>
                {!isPremium && <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center backdrop-blur-[2px]"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>}
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={!isPremium}
                  onClick={() => {
                    const url = prompt('Enter image URL for banner:');
                    if (url) setCustomization({...customization, banner: url});
                  }}
                  className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm font-bold transition-all border border-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit
                </button>
                <button 
                  disabled={!isPremium}
                  onClick={() => setCustomization({...customization, banner: ''})}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Bot Bio / Description</label>
              <span className="text-[10px] text-slate-500 font-mono">{customization.bio.length}/190</span>
            </div>
            <div className="relative">
              <textarea 
                value={customization.bio}
                onChange={(e) => setCustomization({...customization, bio: e.target.value.slice(0, 190)})}
                disabled={!isPremium}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all resize-none font-mono text-sm h-40 disabled:opacity-50"
              />
              {!isPremium && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center backdrop-blur-[2px]">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={resetBio}
                disabled={!isPremium}
                className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-bold transition-all border border-red-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Reset Bio
              </button>
              <button 
                onClick={handleCustomSave}
                disabled={!isPremium || customSaving}
                className="px-6 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold transition-all border border-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {customSaving ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                Save Bot Changes
              </button>
            </div>
          </div>

          {!isPremium && (
            <div className="text-center pt-4">
              <p className="text-red-400 text-sm font-bold flex items-center justify-center gap-2 uppercase tracking-widest">
                💎 Premium subscription required to customize the bots information 💎
              </p>
            </div>
          )}
        </section>

        {/* Core Settings Section */}
        <section className="glass rounded-2xl md:rounded-3xl p-5 md:p-8 border border-white/5 space-y-6">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Automation
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Auto-Role</label>
              
              {currentAutoRole && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-sm text-emerald-400 font-medium">
                    Currently active: <span className="text-white font-bold" style={{ color: currentAutoRole.color || '#fff' }}>{currentAutoRole.name || 'Unknown Role'}</span>
                  </span>
                </div>
              )}
              
              <select 
                value={settings.autoRole} 
                onChange={(e) => setSettings({...settings, autoRole: e.target.value})}
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all appearance-none"
              >
                <option value="">None</option>
                {guildData.roles.map(role => (
                  <option key={role.id} value={role.id} style={{ color: role.color }}>{role.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 px-2">Role given to new members automatically.</p>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`px-10 py-4 rounded-2xl gradient-bg text-white font-bold shadow-xl shadow-red-500/20 hover:scale-105 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
