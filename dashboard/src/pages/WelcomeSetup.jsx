import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Toast from '../components/Toast';
import { Layout, LogIn, LogOut, Image as ImageIcon, Hash, Save, Info, Eye } from 'lucide-react';

export default function WelcomeSetup() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [activeTab, setActiveTab] = useState('welcome'); // 'welcome' or 'goodbye'
  
  const [welcomeConfig, setWelcomeConfig] = useState({
    enabled: false,
    channelId: '',
    title: '',
    description: '',
    bannerUrl: '',
  });

  const [goodbyeConfig, setGoodbyeConfig] = useState({
    enabled: false,
    channelId: '',
    title: '',
    description: '',
    bannerUrl: '',
  });

  const [showVariables, setShowVariables] = useState(false);
  const [toast, setToast] = useState(null);
  const [guildName, setGuildName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchWelcomeConfig(),
        fetchGoodbyeConfig(),
        fetchChannels(),
        fetchGuildName()
      ]);
      setLoading(false);
    };
    fetchData();
  }, [guildId]);

  const fetchGuildName = async () => {
    try {
      const response = await fetch('/api/dashboard/guilds', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const guild = (data.guilds || []).find(g => g.id === guildId);
        if (guild) setGuildName(guild.name);
      }
    } catch (error) {
      console.error('Failed to fetch guild name:', error);
    }
  };

  const fetchWelcomeConfig = async () => {
    try {
      const response = await fetch(`/api/welcome/${guildId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setWelcomeConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch welcome config:', error);
    }
  };

  const fetchGoodbyeConfig = async () => {
    try {
      const response = await fetch(`/api/welcome/goodbye/${guildId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setGoodbyeConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch goodbye config:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch(`/api/welcome/${guildId}/channels`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleSave = async () => {
    const config = activeTab === 'welcome' ? welcomeConfig : goodbyeConfig;
    const endpoint = activeTab === 'welcome' ? `/api/welcome/${guildId}` : `/api/welcome/goodbye/${guildId}`;

    if (config.enabled && !config.channelId) {
      setToast({ message: `Please select a channel for ${activeTab} messages`, type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setToast({ message: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} configuration saved successfully!`, type: 'success' });
      } else {
        const error = await response.json();
        setToast({ message: `Failed to save: ${error.error}`, type: 'error' });
      }
    } catch (error) {
      console.error(`Failed to save ${activeTab} config:`, error);
      setToast({ message: 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const replaceVariables = (text) => {
    if (!text) return '';
    return text
      .replace(/{username}/g, 'NexusUser')
      .replace(/{serverName}/g, guildName || 'Nexus Server')
      .replace(/{user}/g, '@NexusUser');
  };

  const currentConfig = activeTab === 'welcome' ? welcomeConfig : goodbyeConfig;
  const setCurrentConfig = activeTab === 'welcome' ? setWelcomeConfig : setGoodbyeConfig;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome & Goodbye</h1>
        <p className="text-slate-400">Configure automatic messages for members joining or leaving your server</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 bg-slate-900/50 p-1 rounded-xl w-fit border border-white/5">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'welcome' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogIn size={18} />
          Welcome
        </button>
        <button
          onClick={() => setActiveTab('goodbye')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'goodbye' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogOut size={18} />
          Goodbye
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeTab === 'welcome' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Layout size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Message Settings</h2>
              </div>
              <button
                onClick={() => setShowVariables(!showVariables)}
                className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
              >
                <Info size={14} />
                {showVariables ? 'Hide' : 'Show'} Variables
              </button>
            </div>

            {showVariables && (
              <div className="mb-6 bg-slate-950/50 border border-white/5 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">Available Variables:</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-900 px-2 py-1 rounded text-cyan-300 font-mono text-xs">{'{username}'}</code>
                    <span className="text-slate-400">- User's name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-900 px-2 py-1 rounded text-cyan-300 font-mono text-xs">{'{user}'}</code>
                    <span className="text-slate-400">- User mention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-900 px-2 py-1 rounded text-cyan-300 font-mono text-xs">{'{serverName}'}</code>
                    <span className="text-slate-400">- Server name</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-white font-medium">Enable {activeTab} messages</h3>
                  <p className="text-xs text-slate-500">Toggle this to turn the feature on or off</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentConfig.enabled}
                    onChange={(e) => setCurrentConfig({ ...currentConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${activeTab === 'welcome' ? 'peer-checked:bg-cyan-500' : 'peer-checked:bg-red-500'}`}></div>
                </label>
              </div>

              {/* Channel Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Hash size={14} />
                  Target Channel
                </label>
                <select
                  value={currentConfig.channelId}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, channelId: e.target.value })}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none"
                >
                  <option value="">Select a channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}># {channel.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Embed Title</label>
                <input
                  type="text"
                  value={currentConfig.title}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, title: e.target.value })}
                  placeholder={activeTab === 'welcome' ? "Welcome {username}!" : "Goodbye {username}"}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Embed Description</label>
                <textarea
                  value={currentConfig.description}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, description: e.target.value })}
                  placeholder={t('welcomeSetup.embedDescriptionPlaceholder')}
                  rows={4}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
              </div>

              {/* Banner URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <ImageIcon size={14} />
                  Banner Image/GIF URL
                </label>
                <input
                  type="text"
                  value={currentConfig.bannerUrl}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, bannerUrl: e.target.value })}
                  placeholder="https://example.com/image.gif"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all duration-300 shadow-lg disabled:opacity-50 ${
                  activeTab === 'welcome' ? 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20' : 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
                }`}
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save size={20} />
                )}
                Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Config
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-white/10 sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Eye size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">Live Preview</h2>
            </div>

            <div className="bg-[#313338] rounded-xl p-4 shadow-2xl">
              {/* Bot Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  N
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">Nexus Bot</span>
                    <span className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Bot</span>
                    <span className="text-xs text-slate-400 ml-1">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-white text-sm mt-1">
                    {activeTab === 'welcome' ? (
                      <>Welcome <span className="text-[#949cf7] hover:underline cursor-pointer">@NexusUser</span> to **{guildName || 'Nexus Server'}**!</>
                    ) : (
                      <><span className="font-medium">NexusUser</span> has left the server.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Embed */}
              <div className={`border-l-4 ${activeTab === 'welcome' ? 'border-cyan-500' : 'border-red-500'} bg-[#2b2d31] rounded-r-lg p-4 shadow-inner`}>
                {currentConfig.title && (
                  <div className="text-white font-bold mb-2 text-base">
                    {replaceVariables(currentConfig.title)}
                  </div>
                )}
                
                <div className="text-[#dbdee1] text-sm whitespace-pre-wrap leading-relaxed">
                  {replaceVariables(currentConfig.description) || (activeTab === 'welcome' ? 'Welcome to the server!' : 'Goodbye!')}
                  {activeTab === 'welcome' && (
                    <div className="mt-3 font-medium">
                      Invited by: <span className="text-[#949cf7] hover:underline cursor-pointer">@Inviter</span>
                    </div>
                  )}
                </div>

                {currentConfig.bannerUrl && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-white/5">
                    <img
                      src={currentConfig.bannerUrl}
                      alt="Banner"
                      className="w-full h-auto object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                    N
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {activeTab === 'welcome' ? `Thank you for choosing ${guildName || 'Nexus Server'}!` : `We hope to see you again in ${guildName || 'Nexus Server'}!`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <div className="flex gap-3">
                <Info className="text-cyan-400 shrink-0" size={18} />
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-cyan-400 block mb-1">Pro Tip:</strong>
                  Use high-quality GIFs for the banner to make your {activeTab} messages stand out. The Nexus logo will be automatically included in the footer of every message.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
