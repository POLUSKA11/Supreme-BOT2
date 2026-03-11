import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

export default function ServerSelection({ setSelectedGuild, user }) {
  const [guilds, setGuilds] = useState([]);
  const [botInviteUrl, setBotInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [selectingId, setSelectingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    try {
      const response = await fetch('/api/dashboard/guilds', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGuilds(data.guilds || []);
        setBotInviteUrl(data.botInviteUrl || '');
      } else if (response.status === 401) {
        navigate('/dashboard/login');
      } else {
        setToast({ message: 'Failed to fetch servers', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
      setToast({ message: 'Failed to fetch servers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuild = async (guild) => {
    if (!guild.botInGuild) {
      window.open(`${botInviteUrl}&guild_id=${guild.id}`, '_blank');
      setToast({
        message: 'Please add the bot to your server, then refresh this page',
        type: 'info',
      });
      return;
    }

    setSelectingId(guild.id);
    try {
      const response = await fetch('/api/dashboard/select-guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: guild.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedGuild(data.guild);
        setTimeout(() => navigate('/dashboard'), 100);
      } else {
        const error = await response.json();
        setToast({ message: error.error || 'Failed to select server', type: 'error' });
        setSelectingId(null);
      }
    } catch (error) {
      console.error('Failed to select guild:', error);
      setToast({ message: 'Failed to select server', type: 'error' });
      setSelectingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        sessionStorage.removeItem('selectedGuild');
        setSelectedGuild(null);
        window.location.href = '/dashboard/login';
      } else {
        setLoading(false);
        setToast({ message: 'Logout failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
      setToast({ message: 'Logout failed. Please try again.', type: 'error' });
    }
  };

  const filteredGuilds = useMemo(() => {
    return guilds
      .filter((g) => {
        if (filter === 'active') return g.botInGuild;
        if (filter === 'inactive') return !g.botInGuild;
        return true;
      })
      .filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [guilds, search, filter]);

  const totalWithBot = guilds.filter((g) => g.botInGuild).length;
  const totalWithout = guilds.filter((g) => !g.botInGuild).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
          </div>
          <p className="text-slate-400 text-sm font-medium tracking-wide">Loading your servers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="min-h-screen bg-[#0f172a] relative overflow-hidden">
        {/* Subtle background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[160px]"></div>
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[160px]"></div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Top Navigation Bar */}
          <header className="border-b border-white/5 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-indigo-500/20">
                  <img src="/logo.webp" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-white font-bold text-sm tracking-wide hidden sm:block">Supreme Bot</span>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">
                    {user.avatar ? (
                      <img
                        src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                        alt={user.username}
                        className="w-6 h-6 rounded-full ring-1 ring-white/20"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-slate-300 text-xs font-medium">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-xs font-semibold transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                Select a <span className="gradient-text">Server</span>
              </h1>
              <p className="text-slate-500 text-sm">Choose the server you want to manage with Supreme Bot.</p>
            </div>

            {guilds.length === 0 ? (
              /* Empty State */
              <div className="max-w-md mx-auto mt-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Servers Found</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  You don't have Administrator or Manage Server permissions in any servers.
                </p>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
                >
                  Try Another Account
                </button>
              </div>
            ) : (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Total Servers', value: guilds.length, color: 'text-white', bg: 'bg-white/5', border: 'border-white/8' },
                    { label: 'Bot Active', value: totalWithBot, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/15' },
                    { label: 'Needs Setup', value: totalWithout, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/15' },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-xl px-4 py-3 flex items-center gap-3`}>
                      <div>
                        <p className={`text-2xl font-black ${stat.color} leading-none`}>{stat.value}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  {/* Search */}
                  <div className="relative flex-1">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search servers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                    />
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'active', label: 'Active' },
                      { id: 'inactive', label: 'Needs Bot' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          filter === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Server Grid */}
                {filteredGuilds.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-slate-500 text-sm">No servers match your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredGuilds.map((guild) => {
                      const isSelecting = selectingId === guild.id;
                      return (
                        <button
                          key={guild.id}
                          onClick={() => handleSelectGuild(guild)}
                          disabled={!!selectingId}
                          className={`group relative text-left rounded-2xl border transition-all duration-300 overflow-hidden disabled:pointer-events-none ${
                            guild.botInGuild
                              ? 'bg-white/3 border-white/8 hover:border-indigo-500/40 hover:bg-white/6 hover:shadow-xl hover:shadow-indigo-500/10'
                              : 'bg-white/3 border-dashed border-white/10 hover:border-amber-500/30 hover:bg-amber-500/3'
                          } ${isSelecting ? 'opacity-70' : ''}`}
                        >
                          {/* Card Banner / Icon Area */}
                          <div className={`relative h-24 flex items-center justify-center overflow-hidden ${
                            guild.botInGuild
                              ? 'bg-gradient-to-br from-indigo-600/15 to-purple-600/10'
                              : 'bg-gradient-to-br from-slate-700/20 to-slate-800/10'
                          }`}>
                            {/* Decorative circles */}
                            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/3"></div>
                            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/2"></div>

                            {guild.icon ? (
                              <img
                                src={guild.icon}
                                alt={guild.name}
                                className="relative z-10 w-14 h-14 rounded-2xl shadow-xl ring-2 ring-white/10 group-hover:ring-indigo-500/30 transition-all duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-xl ring-2 ring-white/10 group-hover:scale-105 transition-all duration-300 ${
                                guild.botInGuild
                                  ? 'bg-indigo-600/30 text-indigo-300 group-hover:ring-indigo-500/30'
                                  : 'bg-slate-700/50 text-slate-400'
                              }`}>
                                {guild.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Status badge */}
                            <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              guild.botInGuild
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${guild.botInGuild ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                              {guild.botInGuild ? 'Active' : 'Inactive'}
                            </div>

                            {/* Owner crown */}
                            {guild.owner && (
                              <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-xs font-bold">
                                Owner
                              </div>
                            )}
                          </div>

                          {/* Card Body */}
                          <div className="p-4">
                            <h3 className="text-white font-bold text-sm leading-tight line-clamp-1 mb-1 group-hover:text-indigo-200 transition-colors">
                              {guild.name}
                            </h3>

                            {guild.memberCount ? (
                              <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                {guild.memberCount.toLocaleString()} members
                              </p>
                            ) : (
                              <p className="text-slate-600 text-xs mb-3">—</p>
                            )}

                            {/* Action Button */}
                            {isSelecting ? (
                              <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                                <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                                Loading...
                              </div>
                            ) : guild.botInGuild ? (
                              <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600/15 border border-indigo-500/20 group-hover:bg-indigo-600/25 group-hover:border-indigo-500/40 text-indigo-400 text-xs font-semibold transition-all duration-200">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Manage Server
                              </div>
                            ) : (
                              <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/15 group-hover:border-amber-500/30 text-amber-400 text-xs font-semibold transition-all duration-200">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Bot
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Footer hint */}
                <p className="text-center text-slate-600 text-xs mt-10">
                  Showing {filteredGuilds.length} of {guilds.length} servers
                </p>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
