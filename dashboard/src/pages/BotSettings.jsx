import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Image as ImageIcon, 
  FileText, 
  Crown, 
  Save, 
  RotateCcw, 
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

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
    name: '',
    avatar: '',
    banner: '',
    bio: 'Professional Discord Solutions'
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
          setCustomization(prev => ({
            ...prev,
            ...data
          }));
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

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        showMessage('success', 'General settings saved successfully!');
      } else {
        showMessage('error', 'Failed to save general settings.');
      }
    } catch (error) {
      showMessage('error', 'An error occurred while saving.');
    } finally {
      setSaving(false);
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
        showMessage('success', 'Bot customization applied in real-time!');
      } else {
        const data = await response.json();
        showMessage('error', data.error || 'Failed to save customization.');
      }
    } catch (error) {
      showMessage('error', 'An error occurred.');
    } finally {
      setCustomSaving(false);
    }
  };

  const resetBio = () => {
    setCustomization({
      ...customization,
      bio: 'Professional Discord Solutions'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Bot <span className="text-cyan-400">Personalizer</span>
            {isPremium && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-amber-500/30 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Customize how Nexus looks and speaks in your server.</p>
        </div>
      </header>

      {message.text && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Customization Form */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 space-y-6 relative overflow-hidden">
            {!isPremium && (
              <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
                  <Crown className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Premium Feature</h3>
                <p className="text-slate-300 text-sm max-w-xs mb-6">
                  Unlock the ability to change the bot's name, bio, and appearance specifically for your server.
                </p>
                <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2">
                  Upgrade to Premium
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase tracking-widest mb-2">
              <Zap className="w-4 h-4" /> Appearance Settings
            </div>

            <div className="space-y-4">
              {/* Bot Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3 h-3" /> Bot Nickname
                </label>
                <input 
                  type="text"
                  value={customization.name}
                  onChange={(e) => setCustomization({...customization, name: e.target.value})}
                  placeholder="Enter bot name for this server..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                />
              </div>

              {/* Bot Bio */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Bot Bio / About Me
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">{customization.bio.length}/190</span>
                </div>
                <textarea 
                  value={customization.bio}
                  onChange={(e) => setCustomization({...customization, bio: e.target.value.slice(0, 190)})}
                  rows={4}
                  placeholder="Tell users about the bot..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all resize-none font-mono text-sm"
                />
              </div>

              {/* Avatar & Banner URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Avatar URL
                  </label>
                  <input 
                    type="text"
                    value={customization.avatar}
                    onChange={(e) => setCustomization({...customization, avatar: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Banner URL
                  </label>
                  <input 
                    type="text"
                    value={customization.banner}
                    onChange={(e) => setCustomization({...customization, banner: e.target.value})}
                    placeholder="https://..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button 
                onClick={handleCustomSave}
                disabled={customSaving}
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {customSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                Apply Real-Time Changes
              </button>
              <button 
                onClick={resetBio}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all border border-white/5 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Reset Bio
              </button>
            </div>
          </section>

          {/* General Settings */}
          <section className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">
              <ShieldCheck className="w-4 h-4" /> Server Automation
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto-Role</label>
                <select 
                  value={settings.autoRole} 
                  onChange={(e) => setSettings({...settings, autoRole: e.target.value})}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all appearance-none"
                >
                  <option value="">None</option>
                  {guildData.roles.map(role => (
                    <option key={role.id} value={role.id} style={{ color: role.color }}>{role.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 px-1">Role given to new members automatically upon joining.</p>
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                Save Automation Settings
              </button>
            </div>
          </section>
        </div>

        {/* Right: Real-time Preview */}
        <div className="space-y-6">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase tracking-widest mb-4">
              <AlertCircle className="w-4 h-4" /> Live Preview
            </div>

            {/* Discord Profile Card Preview */}
            <div className="bg-[#111214] rounded-2xl overflow-hidden shadow-2xl border border-white/5">
              {/* Banner */}
              <div className="h-24 bg-slate-800 relative">
                {customization.banner && (
                  <img src={customization.banner} alt="Banner" className="w-full h-full object-cover" />
                )}
                {/* Avatar */}
                <div className="absolute -bottom-10 left-4">
                  <div className="w-20 h-20 rounded-full bg-[#111214] p-1.5">
                    <div className="w-full h-full rounded-full bg-slate-700 overflow-hidden relative">
                      <img 
                        src={customization.avatar || '/logo.webp'} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/logo.webp'; }}
                      />
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-[3px] border-[#111214] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Content */}
              <div className="pt-12 p-4 space-y-4">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-1.5">
                    {customization.name || 'Nexus Bot'}
                    <span className="bg-[#5865f2] text-white text-[10px] px-1 py-0.5 rounded font-bold uppercase tracking-tighter">Bot</span>
                  </h3>
                  <p className="text-slate-400 text-xs font-medium">{customization.name?.toLowerCase().replace(/\s+/g, '_') || 'nexus_bot'}</p>
                </div>

                <div className="h-px bg-white/5"></div>

                <div className="space-y-2">
                  <h4 className="text-white text-[10px] font-black uppercase tracking-widest">About Me</h4>
                  <div className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed font-medium">
                    {customization.bio || 'Professional Discord Solutions'}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-white text-[10px] font-black uppercase tracking-widest">Member Since</h4>
                  <p className="text-slate-400 text-xs font-medium">Mar 12, 2026</p>
                </div>

                <div className="pt-2">
                  <div className="w-full py-2 bg-white/5 rounded-md text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Message @{customization.name || 'Nexus Bot'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
              <p className="text-[10px] text-cyan-400/70 leading-relaxed">
                <span className="font-bold text-cyan-400">Note:</span> Real-time changes apply instantly to the bot's nickname in your server. Avatar and bio changes are displayed in the bot's profile within the server context.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
