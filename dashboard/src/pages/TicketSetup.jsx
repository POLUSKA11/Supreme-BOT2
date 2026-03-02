import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Reusable role tag selector component
function RoleSelector({ label, description, selectedIds, onChange, roles, tagColor = 'red' }) {
  const colorMap = {
    red: {
      tag: 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30',
      ring: 'focus:ring-red-500/50 focus:border-red-500/50',
    },
    orange: {
      tag: 'bg-orange-500/20 border-orange-500/30 text-orange-300 hover:bg-orange-500/30',
      ring: 'focus:ring-orange-500/50 focus:border-orange-500/50',
    },
    blue: {
      tag: 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30',
      ring: 'focus:ring-blue-500/50 focus:border-blue-500/50',
    },
    purple: {
      tag: 'bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30',
      ring: 'focus:ring-purple-500/50 focus:border-purple-500/50',
    },
  };
  const colors = colorMap[tagColor] || colorMap.red;

  const availableRoles = roles.filter(r => !selectedIds.includes(r.id));

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}

      {/* Selected role tags */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedIds.map(roleId => {
            const role = roles.find(r => r.id === roleId);
            return (
              <span
                key={roleId}
                className={`px-2 py-1 border rounded text-xs flex items-center gap-1 transition-colors ${colors.tag}`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70 flex-shrink-0" />
                {role?.name || roleId}
                <button
                  onClick={() => onChange(selectedIds.filter(id => id !== roleId))}
                  className="ml-1 opacity-70 hover:opacity-100 font-bold leading-none"
                  title="Remove"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown to add roles */}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value && !selectedIds.includes(e.target.value)) {
            onChange([...selectedIds, e.target.value]);
          }
          e.target.value = '';
        }}
        className={`w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all ${colors.ring}`}
      >
        <option value="">Add a role...</option>
        {availableRoles.map(role => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>
    </div>
  );
}

export default function TicketSetup({ selectedGuild }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Embed fields
  const [embedTitle, setEmbedTitle] = useState('💸 Middleman Tickets');
  const [embedDescription, setEmbedDescription] = useState(
    '📌 **Important**\n' +
    'Only open a ticket when both trading parties have agreed to use a NM MM.\n' +
    'Repeated misuse or spam tickets may lead to temporary or permanent restrictions.\n\n' +
    '⚠️ **Ticket Policy & Requirements**\n' +
    '• NM provides a structured, documented process – not a guarantee, insurance, or refund service.\n' +
    '• All protection applies only to trades handled inside official NM tickets with verified staff.\n' +
    '• Trades in DMs, group chats, or other servers are 100% at your own risk.\n' +
    '• Staff may delay, decline, or cancel any trade that fails verification or looks unsafe.\n' +
    '• Do not send items, accounts, or payments until a NM staff member clearly confirms both sides and tells you when to start.\n\n' +
    '💸 **Here is the NM server\'s official MM tipping policy (Mandatory)**\n' +
    '**Item for Item trades 🏷️:**\n' +
    '• FREE for everyone no matter how big the trade, or how small either.\n' +
    '**Item For Money trades 💸:**\n' +
    '• Tax Included Depends On The Trade'
  );
  const [embedColor, setEmbedColor] = useState('#FF0000');
  const [embedImage, setEmbedImage] = useState('https://cdn.discordapp.com/attachments/1354437993024454817/1461387048639266899/banner.gif');
  const [buttonLabel, setButtonLabel] = useState('Create Middleman Ticket');
  const [buttonEmoji, setButtonEmoji] = useState('🤝');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [ticketCategory, setTicketCategory] = useState('');

  // Role config
  const [roles, setRoles] = useState([]);
  const [staffRoles, setStaffRoles] = useState([]);
  const [blacklistRoles, setBlacklistRoles] = useState([]);
  const [closeRoles, setCloseRoles] = useState([]);
  const [viewRoles, setViewRoles] = useState([]);
  const [useModal, setUseModal] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Welcome to your middleman ticket. Please follow these guidelines:\n\n' +
    '• Be respectful and professional\n' +
    '• Provide clear information about your trade\n' +
    '• Wait for staff verification before proceeding\n' +
    '• Do not share sensitive information'
  );

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
        setCategories(data.filter(ch => ch.type === 4));
      }

      // Fetch roles
      const rolesRes = await fetch('/api/dashboard/roles', { credentials: 'include' });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }

      // Fetch saved ticket config
      const configRes = await fetch('/api/dashboard/ticket-setup/config', { credentials: 'include' });
      if (configRes.ok) {
        const cfg = await configRes.json();
        if (cfg.staffRoles?.length) setStaffRoles(cfg.staffRoles);
        if (cfg.blacklistRoles?.length) setBlacklistRoles(cfg.blacklistRoles);
        if (cfg.closeRoles?.length) setCloseRoles(cfg.closeRoles);
        if (cfg.viewRoles?.length) setViewRoles(cfg.viewRoles);
        if (cfg.useModal !== undefined) setUseModal(cfg.useModal);
        if (cfg.welcomeMessage) setWelcomeMessage(cfg.welcomeMessage);
        if (cfg.ticketCategoryId) setTicketCategory(cfg.ticketCategoryId);
      }
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 5000);
  };

  // Save only the role/config settings (no deploy)
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/dashboard/ticket-setup/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          staffRoles,
          blacklistRoles,
          closeRoles,
          viewRoles,
          useModal,
          welcomeMessage,
          ticketCategoryId: ticketCategory,
        }),
      });
      if (res.ok) {
        showMessage('success', 'Ticket configuration saved successfully!');
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to save configuration');
      }
    } catch (e) {
      showMessage('error', 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Deploy the ticket panel to Discord
  const handleDeploy = async () => {
    if (!selectedChannel) {
      showMessage('error', 'Please select a channel to deploy the ticket panel');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/dashboard/ticket-setup/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          channelId: selectedChannel,
          ticketCategoryId: ticketCategory,
          embed: {
            title: embedTitle,
            description: embedDescription,
            color: embedColor,
            image: embedImage,
          },
          button: {
            label: buttonLabel,
            emoji: buttonEmoji,
          },
          config: {
            staffRoles,
            blacklistRoles,
            closeRoles,
            viewRoles,
            useModal,
            welcomeMessage,
          },
        }),
      });
      if (res.ok) {
        showMessage('success', 'Ticket panel deployed successfully!');
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to deploy ticket panel');
      }
    } catch (e) {
      showMessage('error', 'Failed to deploy ticket panel');
    } finally {
      setSaving(false);
    }
  };

  const formatPreviewText = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          <span className="text-red-400">Ticket</span> Setup
        </h1>
        <p className="text-slate-400">Configure and deploy your ticket panel with a live embed preview.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: Configuration */}
        <div className="space-y-6">

          {/* Channel Selection */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Channel Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Deploy Channel</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                >
                  <option value="">Select a channel...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Channel where the ticket panel will be sent</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ticket Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                >
                  <option value="">Select a category...</option>
                  {categories.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Category where new ticket channels will be created</p>
              </div>
            </div>
          </div>

          {/* Embed Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
              Embed Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={embedTitle}
                  onChange={(e) => setEmbedTitle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                  placeholder="Embed title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={embedDescription}
                  onChange={(e) => setEmbedDescription(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all resize-none font-mono text-sm"
                  placeholder="Embed description (supports **bold** and markdown)..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Embed Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={embedColor}
                      onChange={(e) => setEmbedColor(e.target.value)}
                      className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Banner Image URL</label>
                  <input
                    type="text"
                    value={embedImage}
                    onChange={(e) => setEmbedImage(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Button Configuration */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Button & Creation Mode
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Button Label</label>
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                    placeholder="Button text..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Button Emoji</label>
                  <input
                    type="text"
                    value={buttonEmoji}
                    onChange={(e) => setButtonEmoji(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                    placeholder="🤝"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-sm font-medium text-white">Use Modal Form</h3>
                  <p className="text-xs text-slate-500">Show a popup form when users click the button</p>
                </div>
                <button
                  onClick={() => setUseModal(!useModal)}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative ${useModal ? 'bg-red-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${useModal ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* ===== ROLE PERMISSIONS ===== */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Role Permissions
            </h2>
            <p className="text-xs text-slate-500 mb-5">Configure which roles can interact with tickets. Changes are saved with the "Save Settings" button below.</p>

            <div className="space-y-6">
              {/* Staff / Support Roles */}
              <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5">
                <RoleSelector
                  label="Staff / Support Roles"
                  description="These roles can see and manage all tickets. They are pinged when a ticket is opened."
                  selectedIds={staffRoles}
                  onChange={setStaffRoles}
                  roles={roles}
                  tagColor="red"
                />
              </div>

              {/* Close Ticket Roles */}
              <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5">
                <RoleSelector
                  label="Roles That Can Close Tickets"
                  description="Users with these roles can click the 'Close Ticket' button inside a ticket channel."
                  selectedIds={closeRoles}
                  onChange={setCloseRoles}
                  roles={roles}
                  tagColor="purple"
                />
              </div>

              {/* View-Only Roles */}
              <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5">
                <RoleSelector
                  label="Roles That Can View Tickets (Read-Only)"
                  description="These roles can see ticket channels but cannot send messages. Useful for managers or auditors."
                  selectedIds={viewRoles}
                  onChange={setViewRoles}
                  roles={roles}
                  tagColor="blue"
                />
              </div>

              {/* Blacklisted Roles */}
              <div className="p-4 bg-slate-900/40 rounded-xl border border-red-500/10 border">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-sm font-semibold text-red-300">Blacklisted Roles</span>
                </div>
                <RoleSelector
                  label=""
                  description="Users with any of these roles cannot open tickets. Everyone else can."
                  selectedIds={blacklistRoles}
                  onChange={setBlacklistRoles}
                  roles={roles}
                  tagColor="orange"
                />
              </div>
            </div>

            {/* Save Settings Button */}
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="mt-6 w-full py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-white/10"
            >
              {savingConfig ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>

          {/* Ticket Welcome Message */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Ticket Welcome Message
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Welcome Message</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={6}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all resize-none text-sm"
                placeholder="Message sent when a ticket is opened..."
              />
              <p className="text-xs text-slate-500 mt-1">This message appears at the top of every new ticket</p>
            </div>
          </div>

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            disabled={saving || !selectedChannel}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Deploy Ticket Panel
              </>
            )}
          </button>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Live Preview
          </h2>

          {/* Discord-style embed preview */}
          <div className="bg-[#313338] rounded-lg overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src="/logo.webp" alt="Bot" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">Nexus</span>
                  <span className="bg-[#5865f2] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">BOT</span>
                  <span className="text-[#949ba4] text-xs">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="mt-1 max-w-[520px]">
                  <div className="flex rounded overflow-hidden bg-[#2b2d31]">
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: embedColor }} />
                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <img src="/logo.webp" alt="" className="w-6 h-6 rounded-full" />
                        <span className="text-white text-sm font-medium">Nexus</span>
                      </div>
                      {embedTitle && (
                        <h3 className="text-[#00a8fc] font-bold text-base mb-2">{embedTitle}</h3>
                      )}
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div
                            className="text-[#dbdee1] text-sm leading-relaxed whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: formatPreviewText(embedDescription) }}
                          />
                        </div>
                      </div>
                      {embedImage && (
                        <div className="mt-4 rounded overflow-hidden">
                          <img
                            src={embedImage}
                            alt="Banner"
                            className="w-full max-h-[300px] object-cover rounded"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#949ba4]">
                        <img src="/logo.webp" alt="" className="w-5 h-5 rounded-full" />
                        <span>Nexus Bot</span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-sm font-medium rounded transition-colors">
                    {buttonEmoji && <span>{buttonEmoji}</span>}
                    {buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Role Summary Card */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Current Role Configuration
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Staff Roles', ids: staffRoles, color: 'text-red-300' },
                { label: 'Can Close Tickets', ids: closeRoles, color: 'text-purple-300' },
                { label: 'Can View Tickets', ids: viewRoles, color: 'text-blue-300' },
                { label: 'Blacklisted', ids: blacklistRoles, color: 'text-orange-300' },
              ].map(({ label, ids, color }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-slate-500 w-36 flex-shrink-0">{label}:</span>
                  <span className={`${color} flex-1`}>
                    {ids.length === 0
                      ? <span className="text-slate-600 italic">None set</span>
                      : ids.map(id => {
                          const r = roles.find(ro => ro.id === id);
                          return r?.name || id;
                        }).join(', ')
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How It Works
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">1.</span>
                Configure roles and settings, then click <strong className="text-white">Save Settings</strong> to persist them.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">2.</span>
                Select a deploy channel and click <strong className="text-white">Deploy Ticket Panel</strong> to send the panel to Discord.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">3.</span>
                <strong className="text-white">Staff Roles</strong> can see and manage all tickets.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">4.</span>
                <strong className="text-white">Close Roles</strong> can click the Close Ticket button.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">5.</span>
                <strong className="text-white">View Roles</strong> can read tickets but not send messages.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">6.</span>
                <strong className="text-white">Blacklisted Roles</strong> cannot open any tickets.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
