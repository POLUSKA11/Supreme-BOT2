import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, CreditCard, Zap, Save, CheckCircle2, XCircle, Settings, Image as ImageIcon, Upload, Lock, Unlock } from 'lucide-react';

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
    backgroundImage: null,
    overlayOpacity: 0.6,
    font: 'Montserrat'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalTab, setModalTab] = useState('customize'); // 'customize' or 'visibility'
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [configSaveMessage, setConfigSaveMessage] = useState({ type: '', text: '' });
  const [channels, setChannels] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [unlockingBgs, setUnlockingBgs] = useState(false);
  const [allBackgroundsUnlocked, setAllBackgroundsUnlocked] = useState(false);
  const fileInputRef = useRef(null);

  const guildId = selectedGuild?.id;
  const userId = user?.id || 'default';

  // XP Rate options — sorted in ascending numerical order
  const xpRateOptions = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3];

  // Predefined color palette — no duplicates (removed second #00FFFF)
  const colorPalette = [
    '#00FFFF', '#FFFFFF', '#7B8A8E', '#FF6B6B', '#FFA500', '#FFD700', '#00FF00', '#0099FF', '#6666FF', '#FF00FF'
  ];

  // Locked background presets (require premium/owner to unlock)
  const lockedBackgroundPresets = [
    { id: 'dark2', label: 'Dark Storm', url: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80' },
    { id: 'galaxy', label: 'Galaxy', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80' },
    { id: 'neon', label: 'Neon City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80' },
    { id: 'aurora', label: 'Aurora', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80' },
  ];

  // Free background presets (available to all)
  const freeBackgroundPresets = [
    { id: 'empty', label: 'Empty background', color: '#23272A' },
    { id: 'dark1', label: 'Dark 1', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80' },
    { id: 'forest', label: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80' },
    { id: 'ocean', label: 'Ocean', url: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&q=80' },
    { id: 'sunset', label: 'Sunset', url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80' },
    { id: 'night', label: 'Night', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4b4bf?w=800&q=80' },
  ];

  // All backgrounds shown when unlocked
  const allBackgroundPresets = [...freeBackgroundPresets, ...lockedBackgroundPresets];

  const canAccessPremiumFeatures = isPremium || isOwner;

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
      if (data.success && data.data && Object.keys(data.data).length > 0) {
        const normalized = {
          ...data.data,
          backgroundImage: data.data.backgroundImage || null,
          allBackgroundsUnlocked: data.data.allBackgroundsUnlocked || false,
        };
        setDefaultCardSettings(prev => ({ ...prev, ...normalized }));
        if (normalized.allBackgroundsUnlocked) setAllBackgroundsUnlocked(true);
      }
    } catch (err) {
      console.error('Failed to fetch default card settings:', err);
    }
  }, [guildId]);

  const fetchChannels = useCallback(async () => {
    if (!guildId) return;
    try {
      const res = await fetch('/api/dashboard/channels', { credentials: 'include' });
      const data = await res.json();
      if (Array.isArray(data)) setChannels(data.filter(c => c.type === 0)); // text channels only
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  }, [guildId]);

  const fetchPremiumStatus = useCallback(async () => {
    if (!guildId) return;
    try {
      // Use the dedicated premium-check endpoint that checks both premium and owner status
      const res = await fetch(`/api/leveling/${guildId}/premium-check`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setIsPremium(data.isPremium || false);
        setIsOwner(data.isOwner || false);
      }
    } catch (err) {
      console.error('Failed to fetch premium/owner status:', err);
    }
  }, [guildId]);

  const checkOwnerStatus = useCallback(async () => {
    // Owner status is now handled by fetchPremiumStatus via the premium-check endpoint
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchConfig(),
        fetchDefaultCardSettings(),
        fetchChannels(),
        fetchPremiumStatus(),
        checkOwnerStatus(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchConfig, fetchDefaultCardSettings, fetchChannels, fetchPremiumStatus, checkOwnerStatus]);

  useEffect(() => {
    if (guildId) {
      const settingsStr = encodeURIComponent(JSON.stringify(defaultCardSettings));
      setPreviewUrl(`/api/leveling/${guildId}/card-preview/${userId}?settings=${settingsStr}&t=${Date.now()}`);
    }
  }, [defaultCardSettings, guildId, userId]);

  const showTempMessage = (setter, type, text) => {
    setter({ type, text });
    setTimeout(() => setter({ type: '', text: '' }), 4000);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setConfigSaveMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/leveling/${guildId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showTempMessage(setConfigSaveMessage, 'success', 'Settings saved successfully!');
      } else {
        showTempMessage(setConfigSaveMessage, 'error', data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      showTempMessage(setConfigSaveMessage, 'error', 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaultCard = async () => {
    setSaving(true);
    setSaveMessage({ type: '', text: '' });
    try {
      const settingsToSave = {
        ...defaultCardSettings,
        backgroundImage: defaultCardSettings.backgroundImage || null,
        allBackgroundsUnlocked,
      };

      const response = await fetch(`/api/leveling/${guildId}/card-settings/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDefaultCardSettings(settingsToSave);
        showTempMessage(setSaveMessage, 'success', 'Rank card saved! Changes will appear on Discord level-ups.');
        setTimeout(() => setShowEditModal(false), 1500);
      } else {
        showTempMessage(setSaveMessage, 'error', data.error || 'Failed to save rank card settings.');
      }
    } catch (err) {
      console.error('Failed to save card settings:', err);
      showTempMessage(setSaveMessage, 'error', 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockAllBackgrounds = async () => {
    if (!canAccessPremiumFeatures) {
      showTempMessage(setSaveMessage, 'error', 'You need Premium or be the server owner to unlock all backgrounds.');
      return;
    }
    setUnlockingBgs(true);
    setAllBackgroundsUnlocked(true);
    showTempMessage(setSaveMessage, 'success', 'All backgrounds unlocked! Save to apply.');
    setUnlockingBgs(false);
  };

  const handleUploadBackground = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canAccessPremiumFeatures) {
      setUploadError('You need Premium or be the server owner to upload a custom background.');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploadingBg(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('background', file);

      const response = await fetch(`/api/leveling/${guildId}/upload-background`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setDefaultCardSettings(prev => ({ ...prev, backgroundImage: data.url }));
        showTempMessage(setSaveMessage, 'success', 'Background uploaded! Click Save to apply.');
      } else {
        setUploadError(data.error || 'Failed to upload background.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('An error occurred while uploading.');
    } finally {
      setUploadingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const backgroundsToShow = (canAccessPremiumFeatures && allBackgroundsUnlocked)
    ? allBackgroundPresets
    : freeBackgroundPresets;

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
            <CreditCard className="w-6 h-6 text-cyan-400" />
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
          onClick={() => { setShowEditModal(true); setModalTab('customize'); }}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          Edit server rank card
        </button>
      </div>

      {/* XP Rate Section */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-amber-400" />
            XP Rate
          </h2>
          <p className="text-sm text-slate-400">Change the leveling difficulty by tweaking the rate at which your members will gain XP.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {/* XP Rate buttons — sorted in ascending order */}
            <div className="flex gap-2 flex-wrap">
              {xpRateOptions.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setConfig({ ...config, xpRate: rate })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    config.xpRate === rate
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  x{rate}
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

        {/* Config Save Feedback */}
        {configSaveMessage.text && (
          <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
            configSaveMessage.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {configSaveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{configSaveMessage.text}
          </div>
        )}

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
                  <div className="relative w-full rounded-2xl overflow-hidden bg-slate-800 shadow-xl border border-white/10 min-h-[120px] flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Rank Card Preview" className="w-full h-auto object-contain" onError={(e) => e.target.src = 'https://via.placeholder.com/934x282/1a1a1a/ffffff?text=Rank+Card+Preview'} />
                    ) : (
                      <div className="text-slate-500 text-sm">Loading preview...</div>
                    )}
                  </div>

                  {/* Background Controls */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {/* Unlock All Backgrounds */}
                      <button
                        onClick={handleUnlockAllBackgrounds}
                        disabled={unlockingBgs || (allBackgroundsUnlocked && canAccessPremiumFeatures)}
                        className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all border flex items-center justify-center gap-2 ${
                          canAccessPremiumFeatures
                            ? allBackgroundsUnlocked
                              ? 'bg-green-600/20 text-green-400 border-green-500/30 cursor-default'
                              : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-amber-500/30'
                            : 'bg-amber-600/10 text-amber-500/60 border-amber-500/20 cursor-not-allowed'
                        }`}
                        title={!canAccessPremiumFeatures ? 'Requires Premium or Server Owner' : ''}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {canAccessPremiumFeatures && allBackgroundsUnlocked
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          }
                        </svg>
                        {allBackgroundsUnlocked && canAccessPremiumFeatures ? '✓ All Backgrounds Unlocked' : 'Unlock all backgrounds'}
                        {!canAccessPremiumFeatures && <span className="text-xs ml-1">(Premium/Owner)</span>}
                      </button>

                      {/* Upload Custom Background */}
                      <button
                        onClick={() => {
                          if (!canAccessPremiumFeatures) {
                            setUploadError('You need Premium or be the server owner to upload a custom background.');
                            return;
                          }
                          setUploadError('');
                          fileInputRef.current?.click();
                        }}
                        disabled={uploadingBg}
                        className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                          canAccessPremiumFeatures
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                        }`}
                        title={!canAccessPremiumFeatures ? 'Requires Premium or Server Owner' : ''}
                      >
                        {uploadingBg ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload custom background
                            {!canAccessPremiumFeatures && <span className="text-xs ml-1">(Premium/Owner)</span>}
                          </>
                        )}
                      </button>

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleUploadBackground}
                        className="hidden"
                      />
                    </div>

                    {/* Upload error/info */}
                    {uploadError && (
                      <div className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs border border-red-500/30 flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5" /> {uploadError}
                      </div>
                    )}
                    {!canAccessPremiumFeatures && (
                      <div className="px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400/80 text-xs border border-amber-500/20 flex items-center gap-2">
                        <Crown className="w-3.5 h-3.5 text-amber-500" /> Upload custom background and unlock all backgrounds require <strong>Premium</strong> or being the <strong>Server Owner</strong>.
                      </div>
                    )}
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
                        <p className="text-xs text-slate-500 mt-1 text-right">{Math.round(defaultCardSettings.overlayOpacity * 100)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Background Presets Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                      Background Presets
                      {!canAccessPremiumFeatures && (
                        <span className="text-xs text-amber-400 font-normal">(Unlock more with Premium/Owner)</span>
                      )}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {backgroundsToShow.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setDefaultCardSettings({ ...defaultCardSettings, backgroundImage: bg.url || null })}
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

                      {/* Show locked backgrounds as grayed out if not unlocked */}
                      {!allBackgroundsUnlocked && lockedBackgroundPresets.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={handleUnlockAllBackgrounds}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-amber-500/30 transition-all relative hover:border-amber-500/60"
                          style={{ backgroundImage: `url(${bg.url})`, backgroundSize: 'cover' }}
                          title={`${bg.label} — Unlock with Premium/Owner`}
                        >
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-amber-400 text-xs font-bold">{bg.label}</span>
                          </div>
                        </button>
                      ))}

                      {/* Custom uploaded background preview */}
                      {defaultCardSettings.backgroundImage &&
                        !backgroundsToShow.some(bg => bg.url === defaultCardSettings.backgroundImage) && (
                        <div
                          className="aspect-square rounded-lg overflow-hidden border-2 border-blue-500 scale-105 relative"
                          style={{ backgroundImage: `url(${defaultCardSettings.backgroundImage})`, backgroundSize: 'cover' }}
                          title="Custom uploaded background"
                        >
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-xs text-white py-1 font-bold">
                            Custom
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* ── Visibility Tab ── */
                <div className="space-y-6">
                  <p className="text-slate-400 text-sm">Configure leveling system visibility settings for your server.</p>

                  {/* Enable/Disable Leveling */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <p className="text-white font-semibold">Enable Leveling System</p>
                      <p className="text-slate-400 text-xs mt-1">Toggle XP gain and level-up announcements on or off.</p>
                    </div>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        config.enabled ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                        config.enabled ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {/* Announce Channel */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">Level-up Announcement Channel</label>
                    <p className="text-xs text-slate-500">Where to send level-up messages. Leave empty to announce in the same channel as the message.</p>
                    <select
                      value={config.announceChannel || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, announceChannel: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                    >
                      <option value="">Same channel as message</option>
                      {channels.map(ch => (
                        <option key={ch.id} value={ch.id}>#{ch.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ignored Channels */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">Ignored Channels</label>
                    <p className="text-xs text-slate-500">Messages in these channels will not grant XP.</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {channels.map(ch => (
                        <label key={ch.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
                          <input
                            type="checkbox"
                            checked={config.ignoredChannels?.includes(ch.id) || false}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...(config.ignoredChannels || []), ch.id]
                                : (config.ignoredChannels || []).filter(id => id !== ch.id);
                              setConfig(prev => ({ ...prev, ignoredChannels: updated }));
                            }}
                            className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                          />
                          <span className="text-slate-300 text-sm">#{ch.name}</span>
                        </label>
                      ))}
                      {channels.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4">No text channels found.</p>
                      )}
                    </div>
                  </div>

                  {/* Save visibility settings button */}
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Visibility Settings'}
                  </button>

                    {configSaveMessage.text && (
                      <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                        configSaveMessage.type === 'success'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {configSaveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{configSaveMessage.text}
                      </div>
                    )}
                </div>
              )}

              {/* Save Feedback Message */}
              {saveMessage.text && (
                <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  saveMessage.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{saveMessage.text}
                </div>
              )}

              {/* Buttons (only show in customize tab) */}
              {modalTab === 'customize' && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
