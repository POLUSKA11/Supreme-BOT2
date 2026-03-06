import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';

const ADMIN_USER_ID = '982731220913913856';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(typeof ts === 'string' && ts.includes('-') ? ts : Number(ts));
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - Number(ts);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Avatar({ userId, avatar, username, size = 8 }) {
  const url = avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;
  return (
    <img
      src={url}
      alt={username}
      className={`w-${size} h-${size} rounded-full border border-white/10 object-cover flex-shrink-0`}
      onError={(e) => { e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`; }}
    />
  );
}

function StatCard({ icon, label, value, sub, color = 'red' }) {
  const colors = {
    red: 'from-red-600/20 to-red-900/10 border-red-500/30 text-red-400',
    blue: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    purple: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
    amber: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    emerald: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    cyan: 'from-cyan-600/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400',
  };
  const cls = colors[color] || colors.red;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-2xl p-5 flex flex-col gap-2`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/30 ${cls.split(' ')[3]}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white text-2xl font-black mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Badge({ children, color = 'slate' }) {
  const map = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    slate: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${map[color] || map.slate}`}>
      {children}
    </span>
  );
}

function PlanBadge({ plan }) {
  if (!plan) return <Badge color="slate">Free</Badge>;
  if (plan === 'ultimate') return <Badge color="purple">Ultimate</Badge>;
  if (plan === 'pro') return <Badge color="blue">Pro</Badge>;
  return <Badge color="amber">{plan}</Badge>;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ show, onClose, title, children }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'premium', label: 'Premium', icon: '👑' },
  { id: 'logins', label: 'Web Logins', icon: '🔐' },
  { id: 'users', label: 'Registered Users', icon: '👥' },
  { id: 'guilds', label: 'All Servers', icon: '🌐' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminPanel({ user }) {
  const [isAdmin, setIsAdmin] = useState(null); // null = loading
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [logins, setLogins] = useState([]);
  const [loginsPag, setLoginsPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [regUsers, setRegUsers] = useState([]);
  const [regUsersPag, setRegUsersPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [premium, setPremium] = useState([]);
  const [premiumPag, setPremiumPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [grantModal, setGrantModal] = useState({ show: false, guildId: '', guildName: '', plan: 'pro', duration: 30 });
  const [extendModal, setExtendModal] = useState({ show: false, guildId: '', guildName: '', days: 30 });
  const [revokeModal, setRevokeModal] = useState({ show: false, guildId: '', guildName: '' });
  const [grantFreeModal, setGrantFreeModal] = useState({ show: false, guildId: '', guildName: '', plan: 'pro', duration: 30 });

  // Check admin status
  useEffect(() => {
    fetch('/api/admin/check', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  // ── Fetch Stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoad('stats', true);
    try {
      const r = await fetch('/api/admin/stats', { credentials: 'include' });
      const d = await r.json();
      setStats(d);
    } catch (_) {}
    setLoad('stats', false);
  }, []);

  // ── Fetch Logins ─────────────────────────────────────────────────────────
  const fetchLogins = useCallback(async (page = 1, q = '') => {
    setLoad('logins', true);
    try {
      const r = await fetch(`/api/admin/web-logins?page=${page}&limit=30&search=${encodeURIComponent(q)}`, { credentials: 'include' });
      const d = await r.json();
      setLogins(d.logins || []);
      setLoginsPag(d.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (_) {}
    setLoad('logins', false);
  }, []);

  // ── Fetch Registered Users ───────────────────────────────────────────────
  const fetchRegUsers = useCallback(async (page = 1, q = '') => {
    setLoad('regUsers', true);
    try {
      const r = await fetch(`/api/admin/registered-users?page=${page}&limit=30&search=${encodeURIComponent(q)}`, { credentials: 'include' });
      const d = await r.json();
      setRegUsers(d.users || []);
      setRegUsersPag(d.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (_) {}
    setLoad('regUsers', false);
  }, []);

  // ── Fetch Premium ────────────────────────────────────────────────────────
  const fetchPremium = useCallback(async (page = 1) => {
    setLoad('premium', true);
    try {
      const r = await fetch(`/api/admin/premium/all?page=${page}&limit=30`, { credentials: 'include' });
      const d = await r.json();
      setPremium(d.subscriptions || []);
      setPremiumPag(d.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (_) {}
    setLoad('premium', false);
  }, []);

  // ── Fetch Guilds ─────────────────────────────────────────────────────────
  const fetchGuilds = useCallback(async () => {
    setLoad('guilds', true);
    try {
      const r = await fetch('/api/admin/guilds', { credentials: 'include' });
      const d = await r.json();
      setGuilds(d.guilds || []);
    } catch (_) {}
    setLoad('guilds', false);
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (isAdmin !== true) return;
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'logins') fetchLogins(1, search);
    if (activeTab === 'users') fetchRegUsers(1, search);
    if (activeTab === 'premium') fetchPremium(1);
    if (activeTab === 'guilds') fetchGuilds();
  }, [activeTab, isAdmin]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleGrant = async () => {
    const { guildId, plan, duration } = grantModal;
    if (!guildId.trim()) return showToast('Guild ID is required', 'error');
    setLoad('grantAction', true);
    try {
      const r = await fetch('/api/admin/premium/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: guildId.trim(), plan, duration: parseInt(duration) }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`✅ Premium granted to ${d.guildName || guildId} (${plan}, ${duration}d)`);
        setGrantModal(prev => ({ ...prev, show: false }));
        if (activeTab === 'premium') fetchPremium(1);
        if (activeTab === 'overview') fetchStats();
      } else {
        showToast(d.error || 'Failed to grant premium', 'error');
      }
    } catch (_) { showToast('Request failed', 'error'); }
    setLoad('grantAction', false);
  };

  const handleGrantFromGuild = async () => {
    const { guildId, plan, duration } = grantFreeModal;
    setLoad('grantFreeAction', true);
    try {
      const r = await fetch('/api/admin/premium/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId, plan, duration: parseInt(duration) }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`✅ Premium granted to ${grantFreeModal.guildName}`);
        setGrantFreeModal(prev => ({ ...prev, show: false }));
        fetchGuilds();
        if (activeTab === 'overview') fetchStats();
      } else {
        showToast(d.error || 'Failed', 'error');
      }
    } catch (_) { showToast('Request failed', 'error'); }
    setLoad('grantFreeAction', false);
  };

  const handleRevoke = async () => {
    setLoad('revokeAction', true);
    try {
      const r = await fetch('/api/admin/premium/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: revokeModal.guildId }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`🗑️ Premium revoked from ${revokeModal.guildName}`);
        setRevokeModal(prev => ({ ...prev, show: false }));
        fetchPremium(premiumPag.page);
        if (activeTab === 'overview') fetchStats();
      } else {
        showToast(d.error || 'Failed', 'error');
      }
    } catch (_) { showToast('Request failed', 'error'); }
    setLoad('revokeAction', false);
  };

  const handleExtend = async () => {
    if (!extendModal.days || parseInt(extendModal.days) <= 0) return showToast('Enter valid days', 'error');
    setLoad('extendAction', true);
    try {
      const r = await fetch('/api/admin/premium/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: extendModal.guildId, days: parseInt(extendModal.days) }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`⏰ Extended ${extendModal.guildName} by ${extendModal.days} days`);
        setExtendModal(prev => ({ ...prev, show: false }));
        fetchPremium(premiumPag.page);
      } else {
        showToast(d.error || 'Failed', 'error');
      }
    } catch (_) { showToast('Request failed', 'error'); }
    setLoad('extendAction', false);
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear ALL login logs? This cannot be undone.')) return;
    try {
      await fetch('/api/admin/web-logins/clear', { method: 'DELETE', credentials: 'include' });
      showToast('Login logs cleared');
      fetchLogins(1, search);
      fetchStats();
    } catch (_) { showToast('Failed', 'error'); }
  };

  // ── Guard ────────────────────────────────────────────────────────────────

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
        <div className="w-24 h-24 rounded-3xl bg-red-600/10 flex items-center justify-center text-5xl border border-red-500/20">
          🚫
        </div>
        <div>
          <h2 className="text-3xl font-black text-white">Access Denied</h2>
          <p className="text-slate-400 mt-2">This panel is restricted to the bot administrator only.</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold border backdrop-blur-xl transition-all
          ${toast.type === 'error'
            ? 'bg-red-900/80 border-red-500/50 text-red-200'
            : 'bg-emerald-900/80 border-emerald-500/50 text-emerald-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-900/20 border border-red-500/30 flex items-center justify-center text-2xl shadow-lg shadow-red-500/10">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Admin <span className="text-red-400">Control Panel</span>
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Restricted access — <span className="text-red-400 font-semibold">Owner only</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-2xl border border-white/5">
          {user && <Avatar userId={user.id} avatar={user.avatar} username={user.username} size={8} />}
          <div>
            <p className="text-white text-sm font-bold">{user?.username}</p>
            <p className="text-red-400 text-xs font-semibold">Administrator</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-white/5 rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-red-600/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading.stats ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-7-4h.01M12 16h.01" /></svg>}
                  label="Total Servers" value={stats.totalGuilds?.toLocaleString()} color="blue"
                />
                <StatCard
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                  label="Total Users" value={stats.totalUsers?.toLocaleString()} color="cyan"
                />
                <StatCard
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>}
                  label="Premium Servers" value={stats.premiumCount?.toLocaleString()} color="amber"
                />
                <StatCard
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  label="Web Registrations" value={stats.uniqueWebUsers?.toLocaleString()} color="purple"
                />
                <StatCard
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>}
                  label="Logins (24h)" value={stats.recentLogins?.toLocaleString()} color="emerald" sub="Last 24 hours"
                />
                <StatCard
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  label="Uptime" value={formatUptime(stats.uptime)} color="red" sub={`Ping: ${stats.botPing ?? '?'}ms`}
                />
              </div>

              {/* Bot Status Banner */}
              <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
                stats.botStatus === 'online'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className={`w-3 h-3 rounded-full ${stats.botStatus === 'online' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
                <span className={`font-bold ${stats.botStatus === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                  Bot is {stats.botStatus === 'online' ? 'Online' : 'Offline'}
                </span>
                <span className="text-slate-400 text-sm ml-auto">
                  Ping: <span className="text-white font-semibold">{stats.botPing ?? '?'}ms</span>
                  &nbsp;·&nbsp; Uptime: <span className="text-white font-semibold">{formatUptime(stats.uptime)}</span>
                </span>
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span>⚡</span> Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setGrantModal({ show: true, guildId: '', guildName: '', plan: 'pro', duration: 30 })}
                    className="flex items-center gap-3 p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-all group"
                  >
                    <span className="text-2xl">👑</span>
                    <div className="text-left">
                      <p className="text-white font-semibold text-sm">Grant Premium</p>
                      <p className="text-slate-400 text-xs">Give premium to any server</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveTab('logins'); }}
                    className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all"
                  >
                    <span className="text-2xl">🔐</span>
                    <div className="text-left">
                      <p className="text-white font-semibold text-sm">View Logins</p>
                      <p className="text-slate-400 text-xs">{stats.totalWebLogins?.toLocaleString()} total login events</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveTab('guilds'); }}
                    className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all"
                  >
                    <span className="text-2xl">🌐</span>
                    <div className="text-left">
                      <p className="text-white font-semibold text-sm">Browse Servers</p>
                      <p className="text-slate-400 text-xs">{stats.totalGuilds?.toLocaleString()} servers in bot</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">Failed to load stats. Check bot connection.</div>
          )}
        </div>
      )}

      {/* ── PREMIUM TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'premium' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-white font-bold text-lg">Premium Subscriptions <span className="text-slate-500 text-sm font-normal">({premiumPag.total} total)</span></h2>
            <button
              onClick={() => setGrantModal({ show: true, guildId: '', guildName: '', plan: 'pro', duration: 30 })}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Grant Premium
            </button>
          </div>

          {loading.premium ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : premium.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-3">👑</div>
              <p>No premium subscriptions found.</p>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-black/20">
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Server</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Plan</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Expires</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Method</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {premium.map((sub, i) => (
                      <tr key={sub.guild_id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-black/10'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {sub.guildIcon ? (
                              <img src={sub.guildIcon} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                                {(sub.guildName || sub.guild_id)[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-white font-semibold">{sub.guildName || sub.guild_id}</p>
                              <p className="text-slate-500 text-xs font-mono">{sub.guild_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><PlanBadge plan={sub.plan} /></td>
                        <td className="px-4 py-3">
                          {sub.isActive ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active · {sub.daysLeft}d left
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Expired
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{formatDate(sub.expires_at)}</td>
                        <td className="px-4 py-3">
                          <Badge color={sub.payment_method === 'admin_grant' ? 'purple' : 'blue'}>
                            {sub.payment_method || 'unknown'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExtendModal({ show: true, guildId: sub.guild_id, guildName: sub.guildName || sub.guild_id, days: 30 })}
                              className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold transition-all"
                            >
                              Extend
                            </button>
                            <button
                              onClick={() => setRevokeModal({ show: true, guildId: sub.guild_id, guildName: sub.guildName || sub.guild_id })}
                              className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-all"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {premiumPag.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <span className="text-slate-500 text-xs">Page {premiumPag.page} of {premiumPag.totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={premiumPag.page <= 1} onClick={() => fetchPremium(premiumPag.page - 1)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-slate-300 transition-all">Prev</button>
                    <button disabled={premiumPag.page >= premiumPag.totalPages} onClick={() => fetchPremium(premiumPag.page + 1)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-slate-300 transition-all">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── WEB LOGINS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'logins' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-white font-bold text-lg">Web Login Activity <span className="text-slate-500 text-sm font-normal">({loginsPag.total} events)</span></h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search username or ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); fetchLogins(1, e.target.value); }}
                className="px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 w-52"
              />
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition-all"
              >
                Clear All
              </button>
            </div>
          </div>

          {loading.logins ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logins.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-3">🔐</div>
              <p>No login events recorded yet.</p>
              <p className="text-xs mt-1">Logins are tracked when users authenticate via Discord OAuth.</p>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-black/20">
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">User</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Discord ID</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">IP Address</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Time</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-semibold">Browser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logins.map((log, i) => (
                      <tr key={log.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-black/10'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar userId={log.user_id} avatar={log.avatar} username={log.username} size={8} />
                            <div>
                              <p className="text-white font-semibold">{log.username}</p>
                              {log.discriminator && log.discriminator !== '0' && (
                                <p className="text-slate-500 text-xs">#{log.discriminator}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-xs">{log.user_id}</td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-xs">{log.ip_address || '—'}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-slate-300 text-xs">{formatDate(log.logged_in_at)}</p>
                            <p className="text-slate-500 text-xs">{timeAgo(log.logged_in_at)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={log.user_agent || ''}>
                          {log.user_agent
                            ? log.user_agent.includes('Chrome') ? '🌐 Chrome'
                              : log.user_agent.includes('Firefox') ? '🦊 Firefox'
                              : log.user_agent.includes('Safari') ? '🧭 Safari'
                              : log.user_agent.includes('Edge') ? '🔷 Edge'
                              : '🌐 Browser'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {loginsPag.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <span className="text-slate-500 text-xs">Page {loginsPag.page} of {loginsPag.totalPages} · {loginsPag.total} events</span>
                  <div className="flex gap-2">
                    <button disabled={loginsPag.page <= 1} onClick={() => fetchLogins(loginsPag.page - 1, search)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-slate-300 transition-all">Prev</button>
                    <button disabled={loginsPag.page >= loginsPag.totalPages} onClick={() => fetchLogins(loginsPag.page + 1, search)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-slate-300 transition-all">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── REGISTERED USERS TAB ─────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-white font-bold text-lg">Registered Web Users <span className="text-slate-500 text-sm font-normal">({regUsersPag.total} unique)</span></h2>
            <input
              type="text"
              placeholder="Search username or ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); fetchRegUsers(1, e.target.value); }}
              className="px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 w-52"
            />
          </div>

          {loading.regUsers ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : regUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-3">👥</div>
              <p>No registered users yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regUsers.map(u => (
                <div key={u.user_id} className="bg-slate-900/50 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar userId={u.user_id} avatar={u.avatar} username={u.username} size={10} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{u.username}</p>
                      <p className="text-slate-500 text-xs font-mono truncate">{u.user_id}</p>
                    </div>
                    <Badge color="blue">{u.login_count}x</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>First login</span>
                      <span className="text-slate-300">{timeAgo(u.first_login)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last login</span>
                      <span className="text-emerald-400 font-semibold">{timeAgo(u.last_login)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {regUsersPag.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs">Page {regUsersPag.page} of {regUsersPag.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={regUsersPag.page <= 1} onClick={() => fetchRegUsers(regUsersPag.page - 1, search)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-slate-300 transition-all">Prev</button>
                <button disabled={regUsersPag.page >= regUsersPag.totalPages} onClick={() => fetchRegUsers(regUsersPag.page + 1, search)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs text-slate-300 transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GUILDS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'guilds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">All Bot Servers <span className="text-slate-500 text-sm font-normal">({guilds.length} total)</span></h2>
            <button onClick={fetchGuilds} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-300 transition-all">
              Refresh
            </button>
          </div>

          {loading.guilds ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : guilds.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-3">🌐</div>
              <p>No servers found. Bot may be offline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {guilds.map(g => (
                <div key={g.id} className={`bg-slate-900/50 border rounded-2xl p-4 transition-all hover:border-white/10 ${g.isPremium ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {g.icon ? (
                      <img src={g.icon} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                        {g.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold truncate text-sm">{g.name}</p>
                        {g.isPremium && <span className="text-amber-400 text-xs">👑</span>}
                      </div>
                      <p className="text-slate-500 text-xs font-mono">{g.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>{g.memberCount?.toLocaleString()} members</span>
                    {g.isPremium ? <Badge color="amber">Premium</Badge> : <Badge color="slate">Free</Badge>}
                  </div>
                  <button
                    onClick={() => setGrantFreeModal({ show: true, guildId: g.id, guildName: g.name, plan: 'pro', duration: 30 })}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-all border ${
                      g.isPremium
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    {g.isPremium ? '⚙️ Manage Premium' : '👑 Grant Premium'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {/* Grant Premium Modal */}
      <Modal show={grantModal.show} onClose={() => setGrantModal(prev => ({ ...prev, show: false }))} title="👑 Grant Premium">
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-semibold mb-1.5 block">Guild ID</label>
            <input
              type="text"
              placeholder="Enter Discord Server ID..."
              value={grantModal.guildId}
              onChange={e => setGrantModal(prev => ({ ...prev, guildId: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-semibold mb-1.5 block">Plan</label>
            <select
              value={grantModal.plan}
              onChange={e => setGrantModal(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="pro">Pro — $4.99/mo</option>
              <option value="ultimate">Ultimate — $9.99/mo</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-semibold mb-1.5 block">Duration (days)</label>
            <input
              type="number"
              min="1"
              max="3650"
              value={grantModal.duration}
              onChange={e => setGrantModal(prev => ({ ...prev, duration: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={handleGrant}
            disabled={loading.grantAction}
            className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {loading.grantAction ? 'Granting...' : '👑 Grant Premium'}
          </button>
        </div>
      </Modal>

      {/* Grant from Guild Modal */}
      <Modal show={grantFreeModal.show} onClose={() => setGrantFreeModal(prev => ({ ...prev, show: false }))} title={`👑 Premium for ${grantFreeModal.guildName}`}>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-semibold mb-1.5 block">Plan</label>
            <select
              value={grantFreeModal.plan}
              onChange={e => setGrantFreeModal(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="pro">Pro</option>
              <option value="ultimate">Ultimate</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-semibold mb-1.5 block">Duration (days)</label>
            <input
              type="number"
              min="1"
              max="3650"
              value={grantFreeModal.duration}
              onChange={e => setGrantFreeModal(prev => ({ ...prev, duration: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={handleGrantFromGuild}
            disabled={loading.grantFreeAction}
            className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {loading.grantFreeAction ? 'Granting...' : '👑 Grant Premium'}
          </button>
        </div>
      </Modal>

      {/* Extend Modal */}
      <Modal show={extendModal.show} onClose={() => setExtendModal(prev => ({ ...prev, show: false }))} title={`⏰ Extend ${extendModal.guildName}`}>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-semibold mb-1.5 block">Days to add</label>
            <input
              type="number"
              min="1"
              max="3650"
              value={extendModal.days}
              onChange={e => setExtendModal(prev => ({ ...prev, days: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button
            onClick={handleExtend}
            disabled={loading.extendAction}
            className="w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {loading.extendAction ? 'Extending...' : '⏰ Extend Subscription'}
          </button>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal show={revokeModal.show} onClose={() => setRevokeModal(prev => ({ ...prev, show: false }))} title="🗑️ Revoke Premium">
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm font-semibold">Are you sure?</p>
            <p className="text-slate-400 text-sm mt-1">
              This will immediately revoke premium from <strong className="text-white">{revokeModal.guildName}</strong>. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setRevokeModal(prev => ({ ...prev, show: false }))}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={loading.revokeAction}
              className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading.revokeAction ? 'Revoking...' : '🗑️ Revoke'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
