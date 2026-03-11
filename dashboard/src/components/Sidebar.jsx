import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ServerSelector from './ServerSelector';
import ThemeLanguageSwitcher from './ThemeLanguageSwitcher';

export default function Sidebar({ user, selectedGuild, setSelectedGuild, setIsAuthenticated, onClose }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({
    essentials: true,
    management: true,
    features: false,
  });
  const navigate = useNavigate();

  const handleGuildChange = (guild) => {
    setSelectedGuild(guild);
    navigate('/dashboard');
  };

  const handleChangeServer = () => {
    setSelectedGuild(null);
    navigate('/dashboard/servers');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/dashboard/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ removeTrustedIP: true })
      });
      if (response.ok) {
        sessionStorage.removeItem('selectedGuild');
        setSelectedGuild(null);
        setIsAuthenticated(false);
        window.location.href = '/dashboard/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setIsAuthenticated(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const menuCategories = [
    {
      id: 'essentials',
      label: 'ESSENTIALS',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊', badge: null },
        { path: '/dashboard/welcome-setup/' + (selectedGuild?.id || ''), label: 'Welcome & Goodbye', icon: '👋', badge: null, disabled: !selectedGuild },
        { path: '/dashboard/tickets', label: 'Tickets', icon: '🎫', badge: null },
        { path: '/dashboard/ticket-setup', label: 'Ticket Setup', icon: '⚙️', badge: null },
        { path: '/dashboard/leveling', label: 'Levels', icon: '📈', badge: null },
        { path: '/dashboard/anti-raid', label: 'Anti-Raid', icon: '🛡️', badge: null },
      ]
    },
    {
      id: 'management',
      label: 'SERVER MANAGEMENT',
      items: [
        { path: '/dashboard/users', label: 'Users', icon: '👥', badge: null },
        { path: '/dashboard/giveaways', label: 'Giveaways', icon: '🎁', badge: null },
        { path: '/dashboard/audit-logs', label: 'Audit Logs', icon: '📋', badge: null },
        { path: '/dashboard/transcripts', label: 'Transcripts', icon: '📄', badge: null },
        { path: '/dashboard/staff-verification/' + (selectedGuild?.id || ''), label: 'Staff Verification', icon: '✅', badge: null, disabled: !selectedGuild },
      ]
    },
    {
      id: 'features',
      label: 'MORE FEATURES',
      items: [
        { path: '/dashboard/settings', label: 'Settings', icon: '⚙️', badge: null },
        { path: '/dashboard/ai', label: 'AI Characters', icon: '🤖', badge: null },
        { path: '/dashboard/premium', label: 'Premium', icon: '👑', badge: null, special: 'premium' },
      ]
    }
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className={`${isOpen ? 'w-72' : 'w-20'} h-full bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-xl border-r border-white/8 text-white transition-all duration-500 flex flex-col`}>
      {/* Header with Nexus Logo */}
      <div className="p-4 lg:p-6 flex items-center justify-between border-b border-white/8">
        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-cyan-500/30">
              <img src="/logo.webp" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Nexus</h1>
              <p className="text-xs text-slate-500">Bot</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors hidden lg:block"
        >
          <svg className={`w-5 h-5 text-slate-400 transition-transform duration-500 ${!isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Theme & Language Switcher */}
      {isOpen && (
        <div className="px-4 py-3 border-b border-white/8 flex justify-center">
          <ThemeLanguageSwitcher />
        </div>
      )}

      {/* Server Selector */}
      {isOpen && (
        <div className="px-4 py-4 border-b border-white/8">
          <ServerSelector selectedGuild={selectedGuild} onGuildChange={handleGuildChange} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuCategories.map((category) => (
          <div key={category.id} className="mb-4">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-3 py-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors group"
            >
              <span>{category.label}</span>
              {isOpen && (
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCategories[category.id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7-7m0 0L5 14m7-7v12" />
                </svg>
              )}
            </button>

            {/* Category Items */}
            {expandedCategories[category.id] && (
              <div className="space-y-1">
                {category.items.map((item) => {
                  if (item.disabled) {
                    return (
                      <div
                        key={item.path}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 cursor-not-allowed opacity-40"
                        title="Select a server first"
                      >
                        <span className="text-lg">{item.icon}</span>
                        {isOpen && <span className="text-sm font-medium flex-1">{item.label}</span>}
                      </div>
                    );
                  }

                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        active
                          ? item.special === 'premium'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                          : item.special === 'premium'
                          ? 'text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {isOpen && (
                        <>
                          <span className="text-sm font-medium flex-1">{item.label}</span>
                          {item.badge && <span className="text-xs">{item.badge}</span>}
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Admin Panel - only for admin user */}
        {user?.id === '982731220913913856' && (
          <div className="mt-6 pt-4 border-t border-white/8">
            <button
              onClick={() => toggleCategory('admin')}
              className="w-full flex items-center justify-between px-3 py-2 mb-2 text-xs font-bold text-red-600 uppercase tracking-wider hover:text-red-500 transition-colors"
            >
              <span>⚡ Admin</span>
              {isOpen && (
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedCategories['admin'] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7-7m0 0L5 14m7-7v12" />
                </svg>
              )}
            </button>
            {expandedCategories['admin'] && (
              <Link
                to="/dashboard/admin"
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive('/dashboard/admin')
                    ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                    : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-300'
                }`}
              >
                <span className="text-lg">🔐</span>
                {isOpen && (
                  <>
                    <span className="text-sm font-medium flex-1">Admin Panel</span>
                    {isActive('/dashboard/admin') && <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>}
                  </>
                )}
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-white/8 bg-white/3">
        {user && (
          <div className={`${isOpen ? 'flex items-center gap-3' : 'flex flex-col items-center'} p-2`}>
            <img
              src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt="Avatar"
              className="w-10 h-10 rounded-full border-2 border-cyan-500/30"
            />
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.username}</p>
                {user?.id === '982731220913913856' ? (
                  <p className="text-xs text-red-400 font-bold truncate">⚡ Administrator</p>
                ) : (
                  <p className="text-xs text-slate-500 truncate">{t('common.staffMember')}</p>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all ${!isOpen && 'mt-2'}`}
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
