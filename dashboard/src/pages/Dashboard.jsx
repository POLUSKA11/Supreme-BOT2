import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ selectedGuild }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include',
        });

        if (response.status === 500 || response.status === 404) {
          setStats(null);
          setLoading(false);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedGuild?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!stats && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-3xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10 border border-indigo-500/20">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-7-4h.01M12 16h.01" />
          </svg>
        </div>
        <div className="max-w-md space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tight">Welcome to <span className="gradient-text">Nexus Dashboard</span></h2>
          <p className="text-slate-400">Please select a server from the sidebar to view its statistics and manage its settings.</p>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 font-bold animate-bounce mt-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Select a server to begin</span>
        </div>
      </div>
    );
  }

  // Plugin categories with features
  const pluginCategories = [
    {
      id: 'all',
      name: 'All Plugins',
      plugins: [
        { id: 'welcome', name: 'Welcome & Goodbye', icon: '👋', description: 'Send custom messages when members join or leave', enabled: true, path: '/dashboard/welcome-setup/' + selectedGuild?.id },
        { id: 'tickets', name: 'Tickets', icon: '🎫', description: 'Create and manage support tickets', enabled: true, path: '/dashboard/tickets' },
        { id: 'leveling', name: 'Leveling System', icon: '📈', description: 'Track member activity and assign ranks', enabled: true, path: '/dashboard/leveling' },
        { id: 'giveaways', name: 'Giveaways', icon: '🎁', description: 'Host exciting giveaways for your community', enabled: true, path: '/dashboard/giveaways' },
        { id: 'moderation', name: 'Moderation', icon: '🛡️', description: 'Anti-raid, spam filtering, and auto-moderation', enabled: true, path: '/dashboard/anti-raid' },
        { id: 'logs', name: 'Audit Logs', icon: '📋', description: 'Track all server activities and changes', enabled: true, path: '/dashboard/audit-logs' },
        { id: 'transcripts', name: 'Transcripts', icon: '📄', description: 'Save and export ticket transcripts', enabled: true, path: '/dashboard/transcripts' },
        { id: 'ai', name: 'AI Characters', icon: '🤖', description: 'Create AI-powered chatbots for your server', enabled: true, path: '/dashboard/ai' },
      ]
    },
    {
      id: 'essentials',
      name: 'Essentials',
      plugins: [
        { id: 'welcome', name: 'Welcome & Goodbye', icon: '👋', description: 'Send custom messages when members join or leave', enabled: true, path: '/dashboard/welcome-setup/' + selectedGuild?.id },
        { id: 'tickets', name: 'Tickets', icon: '🎫', description: 'Create and manage support tickets', enabled: true, path: '/dashboard/tickets' },
        { id: 'leveling', name: 'Leveling System', icon: '📈', description: 'Track member activity and assign ranks', enabled: true, path: '/dashboard/leveling' },
      ]
    },
    {
      id: 'community',
      name: 'Community',
      plugins: [
        { id: 'giveaways', name: 'Giveaways', icon: '🎁', description: 'Host exciting giveaways for your community', enabled: true, path: '/dashboard/giveaways' },
        { id: 'leveling', name: 'Leveling System', icon: '📈', description: 'Track member activity and assign ranks', enabled: true, path: '/dashboard/leveling' },
      ]
    },
    {
      id: 'moderation',
      name: 'Moderation',
      plugins: [
        { id: 'moderation', name: 'Moderation', icon: '🛡️', description: 'Anti-raid, spam filtering, and auto-moderation', enabled: true, path: '/dashboard/anti-raid' },
        { id: 'logs', name: 'Audit Logs', icon: '📋', description: 'Track all server activities and changes', enabled: true, path: '/dashboard/audit-logs' },
      ]
    },
  ];

  const currentCategory = pluginCategories.find(c => c.id === activeTab) || pluginCategories[0];

  return (
    <div className="min-h-screen bg-[#0f172a] relative">
      {/* Subtle background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[160px]"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-[160px]"></div>
      </div>

      <div className="relative z-10">
        {/* Top Banner with Promo */}
        <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border-b border-white/10 px-6 py-8 md:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                  {stats?.serverName || 'Dashboard'}
                </h1>
                <p className="text-slate-400 text-sm md:text-base">
                  Manage and configure your server settings
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-400 text-sm font-bold border border-indigo-500/30">
                  v2.4.0 {t('common.stable')}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                  <span className="text-sm font-bold text-slate-300">{t('common.live')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
            <StatCard
              title={t('dashboard.totalMembers')}
              value={stats?.totalMembers?.toLocaleString() || 0}
              icon="👥"
              color="from-blue-600/20 to-blue-600/5"
              borderColor="border-blue-500/30"
              textColor="text-blue-400"
            />
            <StatCard
              title={t('dashboard.activeTickets')}
              value={stats?.activeTickets || 0}
              icon="🎫"
              color="from-emerald-600/20 to-emerald-600/5"
              borderColor="border-emerald-500/30"
              textColor="text-emerald-400"
            />
            <StatCard
              title={t('dashboard.closedTickets')}
              value={stats?.closedTickets || 0}
              icon="✅"
              color="from-purple-600/20 to-purple-600/5"
              borderColor="border-purple-500/30"
              textColor="text-purple-400"
            />
            <StatCard
              title={t('dashboard.botUptime')}
              value={stats?.uptime ? formatUptime(stats.uptime) : 'N/A'}
              icon="⏱️"
              color="from-orange-600/20 to-orange-600/5"
              borderColor="border-orange-500/30"
              textColor="text-orange-400"
            />
          </div>

          {/* Plugin Tabs */}
          <div className="mb-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {pluginCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === category.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/8'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Plugins Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {currentCategory.plugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                onNavigate={() => navigate(plugin.path)}
              />
            ))}
          </div>

          {/* Server Info Section */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Server Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoCard label="Server Name" value={stats?.serverName || 'N/A'} icon="🏠" />
              <InfoCard label="Total Channels" value={stats?.channels || 0} icon="📢" />
              <InfoCard label="Total Roles" value={stats?.roles || 0} icon="👑" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, borderColor, textColor }) {
  return (
    <div className={`glass rounded-2xl p-6 border-l-4 ${borderColor} hover:translate-y-[-4px] transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
    </div>
  );
}

function PluginCard({ plugin, onNavigate }) {
  return (
    <button
      onClick={onNavigate}
      className="group relative rounded-2xl bg-gradient-to-br from-white/8 to-white/3 border border-white/10 p-6 hover:border-indigo-500/40 hover:bg-indigo-600/10 transition-all duration-300 overflow-hidden text-left"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 to-purple-600/0 group-hover:from-indigo-600/10 group-hover:to-purple-600/10 transition-all duration-300 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Icon */}
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
          {plugin.icon}
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-indigo-300 transition-colors">
          {plugin.name}
        </h3>

        {/* Description */}
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
          {plugin.description}
        </p>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            ✓ Enabled
          </span>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors group-hover:translate-x-1 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center gap-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
          <p className="text-white font-bold text-lg">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}
