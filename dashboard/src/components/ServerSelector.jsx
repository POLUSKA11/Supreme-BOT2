import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ServerSelector({ selectedGuild, onGuildChange }) {
  const [guilds, setGuilds] = useState([]);
  const [botInviteUrl, setBotInviteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const response = await fetch('/api/dashboard/guilds', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setGuilds(data.guilds || []);
          setBotInviteUrl(data.botInviteUrl || '');
        }
      } catch (error) {
        console.error('Failed to fetch guilds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGuilds();
  }, []);

  const handleSelectGuild = async (guild) => {
    if (!guild.botInGuild) {
      window.open(`${botInviteUrl}&guild_id=${guild.id}`, '_blank');
      return;
    }

    try {
      const response = await fetch('/api/dashboard/select-guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ guildId: guild.id }),
      });

      if (response.ok) {
        const data = await response.json();
        onGuildChange(data.guild);
        setIsOpen(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to select server');
      }
    } catch (error) {
      console.error('Failed to select guild:', error);
      alert('Failed to select server');
    }
  };

  const handleAddNewServer = () => {
    navigate('/dashboard/servers');
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10"></div>
        <div className="flex-1 h-4 bg-white/10 rounded"></div>
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
        ⚠️ No servers found
      </div>
    );
  }

  const currentGuild = selectedGuild;

  return (
    <div className="relative w-full">
      {/* Main Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 border ${
          currentGuild
            ? 'bg-indigo-600/15 border-indigo-500/30 hover:border-indigo-500/50 hover:bg-indigo-600/20'
            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {currentGuild ? (
            <>
              {currentGuild.icon ? (
                <img
                  src={currentGuild.icon}
                  alt={currentGuild.name}
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                  {currentGuild.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentGuild.name}</p>
                {currentGuild.memberCount && (
                  <p className="text-xs text-slate-500">{currentGuild.memberCount.toLocaleString()} members</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm font-bold text-indigo-400">Select a Server</p>
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7-7m0 0L5 14m7-7v12" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {/* Current Server Section */}
              {currentGuild && (
                <>
                  <div className="px-3 py-2 bg-white/5 border-b border-white/8">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 py-1">Current Server</p>
                  </div>
                  <div className="px-3 py-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all"
                    >
                      {currentGuild.icon ? (
                        <img
                          src={currentGuild.icon}
                          alt={currentGuild.name}
                          className="w-8 h-8 rounded-lg"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                          {currentGuild.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold">{currentGuild.name}</p>
                        {currentGuild.memberCount && (
                          <p className="text-xs text-indigo-400/70">{currentGuild.memberCount.toLocaleString()} members</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Other Servers Section */}
                  {guilds.filter(g => g.id !== currentGuild.id).length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-white/5 border-b border-white/8 border-t">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 py-1">Other Servers</p>
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        {guilds.filter(g => g.id !== currentGuild.id).map((guild) => (
                          <button
                            key={guild.id}
                            onClick={() => handleSelectGuild(guild)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                              guild.botInGuild
                                ? 'text-slate-300 hover:bg-white/5'
                                : 'text-slate-400 hover:bg-white/5 border border-dashed border-slate-600'
                            }`}
                          >
                            {guild.icon ? (
                              <img
                                src={guild.icon}
                                alt={guild.name}
                                className="w-8 h-8 rounded-lg"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 font-bold text-xs">
                                {guild.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-bold truncate">{guild.name}</p>
                              {guild.botInGuild && guild.memberCount ? (
                                <p className="text-xs text-slate-500">{guild.memberCount.toLocaleString()} members</p>
                              ) : (
                                <p className="text-xs text-amber-500">⚠️ Bot not added</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* No Current Guild - Show All */}
              {!currentGuild && (
                <div className="px-3 py-2 space-y-1">
                  {guilds.map((guild) => (
                    <button
                      key={guild.id}
                      onClick={() => handleSelectGuild(guild)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        guild.botInGuild
                          ? 'text-slate-300 hover:bg-white/5'
                          : 'text-slate-400 hover:bg-white/5 border border-dashed border-slate-600'
                      }`}
                    >
                      {guild.icon ? (
                        <img
                          src={guild.icon}
                          alt={guild.name}
                          className="w-8 h-8 rounded-lg"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 font-bold text-xs">
                          {guild.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-bold truncate">{guild.name}</p>
                        {guild.botInGuild && guild.memberCount ? (
                          <p className="text-xs text-slate-500">{guild.memberCount.toLocaleString()} members</p>
                        ) : (
                          <p className="text-xs text-amber-500">⚠️ Bot not added</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Add New Server */}
            <div className="border-t border-white/8 bg-white/3 px-3 py-2">
              <button
                onClick={handleAddNewServer}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">Add new server</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
