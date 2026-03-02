import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function AntiRaid({ selectedGuild }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [channels, setChannels] = useState([]);

  // Config state
  const [config, setConfig] = useState({
    anti_link: false,
    anti_spam: false,
    anti_promo: false,
    anti_badwords: false,
    lockdown: false,
    log_channel: '',
    banned_words: [],
    spam_threshold: 5
  });

  const [bannedWordsInput, setBannedWordsInput] = useState('');

  useEffect(() => {
    if (selectedGuild?.id) {
      fetchData();
    }
  }, [selectedGuild?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch channels
      const chRes = await fetch('/api/dashboard/channels', { credentials: 'include' });
      if (chRes.ok) {
        const data = await chRes.json();
        setChannels(data.filter(ch => ch.type === 0));
      }

      // Fetch anti-raid config
      const cfgRes = await fetch('/api/dashboard/anti-raid/config', { credentials: 'include' });
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setConfig(cfg);
        setBannedWordsInput(cfg.banned_words?.join(', ') || '');
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const configToSave = {
        ...config,
        banned_words: bannedWordsInput.split(',').map(w => w.trim()).filter(w => w)
      };

      const res = await fetch('/api/dashboard/anti-raid/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(configToSave)
      });

      if (res.ok) {
        setSuccess('✅ Anti-Raid configuration saved successfully!');
        setConfig(configToSave);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save configuration');
      }
    } catch (e) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
      setTimeout(() => { setSuccess(''); setError(''); }, 5000);
    }
  };

  const toggleModule = (module) => {
    setConfig(prev => ({ ...prev, [module]: !prev[module] }));
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-red-400">🛡️ Anti-Raid</span> System
        </h1>
        <p className="text-slate-400">Protect your server from raids, spam, and malicious content.</p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-6">

          {/* Security Modules */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Security Modules
            </h2>

            <div className="space-y-3">
              {[
                { key: 'anti_link', label: '🔗 Anti-Link', desc: 'Block all external links' },
                { key: 'anti_promo', label: '📢 Anti-Promotion', desc: 'Block Discord invite links' },
                { key: 'anti_spam', label: '⚡ Anti-Spam', desc: 'Prevent message spamming' },
                { key: 'anti_badwords', label: '🤬 Anti-BadWords', desc: 'Filter banned words' },
                { key: 'lockdown', label: '🔒 Lockdown Mode', desc: 'Block all messages (emergency)' }
              ].map(module => (
                <div key={module.key} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{module.label}</h3>
                    <p className="text-xs text-slate-500">{module.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleModule(module.key)}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${config[module.key] ? 'bg-red-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${config[module.key] ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Advanced Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Log Channel</label>
                <select
                  value={config.log_channel}
                  onChange={(e) => setConfig(prev => ({ ...prev, log_channel: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                >
                  <option value="">Select a channel for logging...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Violations will be logged here</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Spam Threshold</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={config.spam_threshold}
                  onChange={(e) => setConfig(prev => ({ ...prev, spam_threshold: parseInt(e.target.value) || 5 }))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">Messages per 5 seconds before triggering spam filter</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Banned Words (comma-separated)</label>
                <textarea
                  value={bannedWordsInput}
                  onChange={(e) => setBannedWordsInput(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all resize-none text-sm"
                  placeholder="badword1, badword2, badword3..."
                />
                <p className="text-xs text-slate-500 mt-1">Words will be matched case-insensitively</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Anti-Raid Configuration
              </>
            )}
          </button>
        </div>

        {/* Right: Info Panel */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Status Overview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-slate-900/40 rounded">
                <span className="text-slate-400">Active Modules:</span>
                <span className="text-red-400 font-semibold">
                  {Object.values(config).filter((v, i) => i < 5 && v === true).length}/5
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900/40 rounded">
                <span className="text-slate-400">Banned Words:</span>
                <span className="text-red-400 font-semibold">{config.banned_words?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900/40 rounded">
                <span className="text-slate-400">Log Channel:</span>
                <span className="text-red-400 font-semibold">{config.log_channel ? '✅' : '❌'}</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Features
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Real-time message filtering</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Automatic violation logging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Customizable banned words</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Spam rate limiting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Emergency lockdown mode</span>
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6">
            <h3 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tips
            </h3>
            <ul className="space-y-2 text-xs text-blue-200">
              <li>• Moderators bypass all filters</li>
              <li>• Set a log channel to track violations</li>
              <li>• Use Lockdown only in emergencies</li>
              <li>• Adjust spam threshold based on server activity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
