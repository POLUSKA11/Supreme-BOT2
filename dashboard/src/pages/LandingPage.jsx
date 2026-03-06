import { useState, useEffect, useRef } from 'react';

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, suffix = '', start }) {
  const count = useCountUp(value, 2200, start);
  return (
    <div className="text-center px-4 md:px-8">
      <div className="text-4xl md:text-5xl font-black text-white tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, delay = 0 }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
      className="group relative bg-slate-800/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-red-500/30 hover:bg-slate-800/60 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10"
    >
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:bg-red-500/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title, subtitle }) {
  const [ref, inView] = useInView(0.2);
  return (
    <div
      ref={ref}
      className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      {eyebrow && (
        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-3 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
        {title}
      </h2>
      {subtitle && <p className="text-slate-400 text-base md:text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ─── Mock Discord message ─────────────────────────────────────────────────────
function MockMsg({ avatarText, avatarImg, username, isBot, badge, message, time, delay = 0 }) {
  const [ref, inView] = useInView(0.05);
  return (
    <div
      ref={ref}
      className="flex items-start gap-3 py-1.5"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0)' : 'translateX(-15px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
        {avatarImg ? <img src={avatarImg} alt={username} className="w-full h-full object-cover" /> : avatarText}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-sm font-semibold ${isBot ? 'text-red-400' : 'text-white'}`}>{username}</span>
          {isBot && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">BOT</span>}
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.name}</span>}
          <span className="text-slate-500 text-xs">{time}</span>
        </div>
        <div className="text-slate-300 text-sm leading-relaxed">{message}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({ guilds: 12, users: 5000, premium: 3 });
  const [statsRef, statsInView] = useInView(0.3);
  const [heroRef, heroInView] = useInView(0.05);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setStats({
          guilds: data.totalGuilds || 12,
          users: data.totalUsers || 5000,
          premium: data.premiumCount || 3,
        });
      })
      .catch(() => {});
  }, []);

  const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=1459183931005075701&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden">

      {/* ── Background grid ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(239,68,68,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239,68,68,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          zIndex: 0,
        }}
      />

      {/* ── Ambient glows ── */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-red-600/8 rounded-full blur-[120px] pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed top-1/2 right-0 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none" style={{ zIndex: 0 }} />

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{
          background: scrollY > 60 ? 'rgba(10,14,26,0.95)' : 'transparent',
          backdropFilter: scrollY > 60 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 60 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow">
              <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black tracking-tight">Nexus<span className="text-red-400">Bot</span></span>
          </a>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Commands', href: '#commands' },
              { label: 'Premium', href: '#premium' },
            ].map(l => (
              <li key={l.label}>
                <a href={l.href} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a href="/dashboard/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
              Login
            </a>
            <a
              href={BOT_INVITE}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Add to Discord
            </a>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 flex flex-col gap-1.5">
              <span className={`block h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-64' : 'max-h-0'}`}>
          <div className="px-4 pb-4 flex flex-col gap-2 bg-[#0a0e1a]/95 backdrop-blur-xl border-t border-white/5">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Commands', href: '#commands' },
              { label: 'Premium', href: '#premium' },
              { label: 'Dashboard', href: '/dashboard/login' },
            ].map(l => (
              <a key={l.label} href={l.href} className="py-2.5 text-slate-300 hover:text-white font-medium text-sm border-b border-white/5 last:border-0" onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
            <a href={BOT_INVITE} target="_blank" rel="noreferrer" className="mt-2 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl text-center transition-colors">
              Add to Discord
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: text */}
            <div
              style={{
                opacity: heroInView ? 1 : 0,
                transform: heroInView ? 'translateY(0)' : 'translateY(50px)',
                transition: 'opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s',
              }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                The #1 Discord Bot for Trading Communities
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6">
                The{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Ultimate
                </span>
                <br />
                Discord Bot
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Experience
                </span>
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg">
                Nexus powers your community with elite moderation, middleman services,
                AI-driven insights, leveling, giveaways, and a stunning web dashboard.
                Built for performance. Designed for growth.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <a
                  href={BOT_INVITE}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold text-base rounded-xl transition-all shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-1 active:translate-y-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Add to Discord — Free
                </a>
                <a
                  href="/dashboard/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-base rounded-xl transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  Open Dashboard
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>

              {/* Trust */}
              <div className="flex flex-wrap gap-5 text-slate-500 text-sm">
                {[
                  { icon: '🛡️', text: 'Trusted & Secure' },
                  { icon: '⚡', text: '99.9% Uptime' },
                  { icon: '🕐', text: '24/7 Active' },
                ].map(t => (
                  <div key={t.text} className="flex items-center gap-1.5">
                    <span>{t.icon}</span>
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Discord mock */}
            <div
              style={{
                opacity: heroInView ? 1 : 0,
                transform: heroInView ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
                transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s',
              }}
              className="relative"
            >
              {/* Floating cards */}
              <div
                className="absolute -top-6 -left-4 z-10 flex items-center gap-3 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-xl"
                style={{ animation: 'float 4s ease-in-out infinite' }}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">⚡</div>
                <div>
                  <div className="text-white text-xs font-bold">Bot Online</div>
                  <div className="text-emerald-400 text-[10px]">● 99.9% uptime</div>
                </div>
              </div>

              <div
                className="absolute -bottom-4 -right-4 z-10 flex items-center gap-3 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-xl"
                style={{ animation: 'float 4s ease-in-out infinite 2s' }}
              >
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm">🛡️</div>
                <div>
                  <div className="text-white text-xs font-bold">Anti-Raid Active</div>
                  <div className="text-slate-400 text-[10px]">0 threats today</div>
                </div>
              </div>

              {/* Discord window */}
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/8" style={{ background: '#313338' }}>
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1f22] border-b border-black/20">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="text-slate-400"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    <span className="text-slate-400 text-xs font-medium"># middleman</span>
                  </div>
                </div>

                <div className="flex" style={{ height: '380px' }}>
                  {/* Server list */}
                  <div className="w-14 bg-[#1e1f22] flex flex-col items-center py-3 gap-2 flex-shrink-0">
                    <div className="w-10 h-10 rounded-[14px] overflow-hidden border-2 border-red-500 shadow-lg shadow-red-500/30">
                      <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-6 h-0.5 bg-slate-600 rounded-full my-1" />
                    {['🎮', '🛡️', '💎'].map((e, i) => (
                      <div key={i} className="w-10 h-10 rounded-[14px] bg-slate-700 hover:rounded-xl hover:bg-slate-600 transition-all flex items-center justify-center text-sm cursor-pointer">{e}</div>
                    ))}
                  </div>

                  {/* Channel list */}
                  <div className="w-36 bg-[#2b2d31] flex flex-col flex-shrink-0 overflow-hidden">
                    <div className="px-3 py-3 flex items-center justify-between border-b border-black/20">
                      <span className="text-white text-xs font-bold truncate">Supreme Trading</span>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-slate-400 flex-shrink-0"><path d="M19 9l-7 7-7-7"/></svg>
                    </div>
                    <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                      <div className="text-slate-500 text-[9px] font-bold uppercase px-2 py-1 tracking-wider">📢 Info</div>
                      {['# general', '# announcements'].map(c => (
                        <div key={c} className="px-2 py-1 text-slate-400 text-xs rounded hover:bg-white/5 hover:text-white cursor-pointer transition-colors">{c}</div>
                      ))}
                      <div className="text-slate-500 text-[9px] font-bold uppercase px-2 py-1 tracking-wider mt-2">🔒 Trading</div>
                      <div className="px-2 py-1 text-white text-xs rounded bg-white/10 cursor-pointer"># middleman</div>
                      <div className="px-2 py-1 text-slate-400 text-xs rounded hover:bg-white/5 hover:text-white cursor-pointer transition-colors"># bot-commands</div>
                      <div className="text-slate-500 text-[9px] font-bold uppercase px-2 py-1 tracking-wider mt-2">🎮 Gaming</div>
                      <div className="px-2 py-1 text-slate-400 text-xs rounded hover:bg-white/5 hover:text-white cursor-pointer transition-colors"># giveaways</div>
                    </div>
                    <div className="p-2 bg-[#232428] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">NM</div>
                      <div className="min-w-0">
                        <div className="text-white text-[10px] font-semibold truncate">Supreme</div>
                        <div className="text-slate-500 text-[9px]">Online</div>
                      </div>
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                      <MockMsg
                        avatarImg="/nexus_logo.png"
                        username="NexusBot"
                        isBot
                        message={<span>✅ <strong>Middleman session started!</strong> Both parties verified. Trade safely.</span>}
                        time="4:01 PM"
                        delay={200}
                      />
                      <MockMsg
                        avatarText="S"
                        username="Supreme"
                        badge={{ name: 'MM', bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' }}
                        message="I'll be your middleman. Please confirm your items."
                        time="4:02 PM"
                        delay={400}
                      />
                      <MockMsg
                        avatarText="F"
                        username="FocusedOVP"
                        message="Confirmed! Sending 500 V-Bucks now."
                        time="4:02 PM"
                        delay={600}
                      />
                      <MockMsg
                        avatarImg="/nexus_logo.png"
                        username="NexusBot"
                        isBot
                        message={<span>🎉 <strong>Trade completed!</strong> Transaction logged. Rate your experience!</span>}
                        time="4:03 PM"
                        delay={800}
                      />
                    </div>
                    <div className="mx-3 mb-3 px-4 py-2.5 rounded-xl bg-[#383a40] text-slate-500 text-xs">
                      Message #middleman
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section ref={statsRef} className="relative py-16 border-y border-white/5" style={{ zIndex: 1 }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value={stats.guilds} label="Servers" suffix="+" start={statsInView} />
            <StatCard value={stats.users} label="Members Served" suffix="+" start={statsInView} />
            <StatCard value={stats.premium} label="Premium Servers" start={statsInView} />
            <StatCard value={99} label="Uptime %" suffix="%" start={statsInView} />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow="Everything you need"
            title={<>Packed with <span style={{ background: 'linear-gradient(135deg,#f87171,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Powerful</span> Features</>}
            subtitle="From elite moderation to AI-powered tools, Nexus has everything your Discord community needs to thrive."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
                title: 'Elite Moderation',
                description: 'Anti-raid, auto-mod, link filtering, spam detection, and comprehensive audit logs to keep your server safe 24/7.',
                delay: 0,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
                title: 'Middleman Services',
                description: 'Secure, verified middleman application system with DM questionnaires, staff review, and transaction logging.',
                delay: 80,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
                title: 'Leveling System',
                description: 'Engage your community with XP-based leveling, custom rank cards, leaderboards, and role rewards.',
                delay: 160,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
                title: 'Giveaway Manager',
                description: 'Create, manage, and auto-end giveaways with role requirements, winner selection, and re-roll.',
                delay: 240,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
                title: 'AI Assistant',
                description: 'Powered by advanced AI, Nexus can answer questions, analyze prices, and provide personalized server assistance.',
                delay: 320,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z"/></svg>,
                title: 'Ticket System',
                description: 'Professional support tickets with categories, transcripts, staff assignment, and full dashboard management.',
                delay: 400,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
                title: 'Invite Tracking',
                description: 'Track who invited whom, manage fake invites, bonus invites, and display detailed invite leaderboards.',
                delay: 480,
              },
              {
                icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
                title: 'Web Dashboard',
                description: 'Manage everything from a beautiful, responsive dashboard. Configure settings, view stats, and control your bot.',
                delay: 560,
              },
            ].map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase: Middleman ── */}
      <section id="commands" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Visual */}
            <ShowcaseDiscordCard />
            {/* Text */}
            <ShowcaseText
              eyebrow="Middleman System"
              title={<>Secure Trades,<br /><span style={{ background: 'linear-gradient(135deg,#f87171,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Every Time</span></>}
              desc="Our fully automated middleman application system guides applicants through 11 questions via DM, stores responses securely, and notifies staff for review. Accept or deny with a single click."
              bullets={[
                'DM-based 11-question application flow',
                'Persistent across bot restarts',
                'Staff accept/deny with modal notes',
                'Stored in TiDB for full history',
              ]}
              cta={{ label: 'Get Started Free', href: BOT_INVITE, external: true }}
            />
          </div>
        </div>
      </section>

      {/* ── Showcase: Dashboard ── */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text first on desktop */}
            <ShowcaseText
              eyebrow="Web Dashboard"
              title={<>Full Control,<br /><span style={{ background: 'linear-gradient(135deg,#f87171,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>At Your Fingertips</span></>}
              desc="Manage every aspect of your server from our beautiful, responsive dashboard. View real-time stats, configure settings, manage tickets, and control premium features — all from your browser."
              bullets={[
                'Real-time server statistics',
                'Ticket management & transcripts',
                'Anti-raid configuration',
                'Premium bot customization (avatar, banner, bio)',
              ]}
              cta={{ label: 'Open Dashboard', href: '/dashboard/login', external: false }}
            />
            {/* Dashboard preview */}
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Premium ── */}
      <section id="premium" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/30" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow="Premium"
            title={<>Unlock <span style={{ background: 'linear-gradient(135deg,#f87171,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Premium</span> Power</>}
            subtitle="Take your server to the next level with exclusive features, priority support, and advanced customization."
          />

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <PricingCard
              name="Free"
              price="$0"
              period="/mo"
              features={['Moderation commands', 'Basic leveling', 'Invite tracking', 'Ticket system', 'Giveaways', 'Web dashboard access']}
              cta={{ label: 'Add for Free', href: BOT_INVITE, external: true }}
              featured={false}
            />
            {/* Pro */}
            <PricingCard
              name="Pro"
              price="$4.99"
              period="/mo"
              badge="Most Popular"
              features={['Everything in Free', 'Custom bot avatar', 'Custom bot banner', 'Custom bot bio', 'Priority support', 'Advanced analytics', 'Unlimited tickets']}
              cta={{ label: 'Get Pro', href: '/dashboard/login', external: false }}
              featured={true}
            />
            {/* Ultimate */}
            <PricingCard
              name="Ultimate"
              price="$9.99"
              period="/mo"
              features={['Everything in Pro', 'AI assistant access', 'Custom commands', 'White-label branding', 'Dedicated support', 'Early access features', 'API access']}
              cta={{ label: 'Get Ultimate', href: '/dashboard/login', external: false }}
              featured={false}
            />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-red-500/20 p-12 text-center">
            {/* Background */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.15) 0%, rgba(10,14,26,0.8) 70%)' }} />
            <div className="absolute inset-0 border border-red-500/10 rounded-3xl" />

            <div className="relative z-10">
              <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6 shadow-2xl shadow-red-500/30">
                <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                Ready to power up<br />your server?
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                Join thousands of Discord communities already using Nexus. Free forever, premium when you need it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={BOT_INVITE}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-xl shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Add Nexus to Discord
                </a>
                <a
                  href="/dashboard/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all hover:-translate-y-1"
                >
                  Open Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1, background: '#070a12' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-red-500/20">
                  <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
                </div>
                <span className="text-white font-black text-xl">NexusBot</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                The ultimate Discord bot for trading communities. Secure, powerful, and always online.
              </p>
              <a
                href={BOT_INVITE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Join our Discord
              </a>
            </div>

            {[
              {
                heading: 'Product',
                links: [
                  { label: 'Features', href: '#features' },
                  { label: 'Premium', href: '#premium' },
                  { label: 'Add to Discord', href: BOT_INVITE },
                  { label: 'Dashboard', href: '/dashboard/login' },
                ],
              },
              {
                heading: 'Commands',
                links: [
                  { label: 'Moderation', href: '#commands' },
                  { label: 'Leveling', href: '#commands' },
                  { label: 'Giveaways', href: '#commands' },
                  { label: 'Tickets', href: '#commands' },
                ],
              },
              {
                heading: 'Legal',
                links: [
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Terms of Service', href: '#' },
                  { label: 'Cookie Policy', href: '#' },
                ],
              },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <a href={l.href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-slate-600 text-sm">© {new Date().getFullYear()} NexusBot. All rights reserved.</span>
            <span className="text-slate-600 text-sm">Made with ❤️ for the community</span>
          </div>
        </div>
      </footer>

      {/* ── Float animation ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

// ─── Showcase text block ──────────────────────────────────────────────────────
function ShowcaseText({ eyebrow, title, desc, bullets, cta }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0)' : 'translateX(-30px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-3 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
        {eyebrow}
      </span>
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-5">{title}</h2>
      <p className="text-slate-400 text-base leading-relaxed mb-6">{desc}</p>
      <ul className="space-y-3 mb-8">
        {bullets.map(b => (
          <li key={b} className="flex items-center gap-3 text-slate-300 text-sm">
            <span className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 text-xs flex-shrink-0">✓</span>
            {b}
          </li>
        ))}
      </ul>
      <a
        href={cta.href}
        target={cta.external ? '_blank' : undefined}
        rel={cta.external ? 'noreferrer' : undefined}
        className="inline-flex items-center gap-2 px-7 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5"
      >
        {cta.label}
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    </div>
  );
}

// ─── Showcase Discord card ────────────────────────────────────────────────────
function ShowcaseDiscordCard() {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0) scale(1)' : 'translateX(30px) scale(0.97)',
        transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
      }}
    >
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/8" style={{ background: '#313338' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1f22] border-b border-black/20">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-slate-400 text-xs ml-2"># middleman-applications</span>
        </div>
        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Embed */}
          <div className="rounded-xl overflow-hidden border-l-4 border-red-500 bg-[#2b2d31] p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src="/nexus_logo.png" alt="NM" className="w-5 h-5 rounded-full" />
              <span className="text-white text-sm font-bold">Nexus MM — MM Trainee Application</span>
            </div>
            <p className="text-slate-300 text-xs mb-1">This application consists of <strong>11 questions</strong>.</p>
            <p className="text-slate-500 text-xs mb-3">Click "Start Application" to begin.</p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition-colors">✅ Start Application</button>
              <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors">🛑 Close Application</button>
            </div>
          </div>
          {/* Messages */}
          <MockMsg
            avatarImg="/nexus_logo.png"
            username="NexusBot"
            isBot
            message="Question 1 of 11: What is your age?"
            time="4:01 AM"
            delay={100}
          />
          <MockMsg
            avatarText="F"
            username="FocusedOVP"
            message="."
            time="4:01 AM"
            delay={200}
          />
          <MockMsg
            avatarImg="/nexus_logo.png"
            username="NexusBot"
            isBot
            message={<span>✅ <strong>Selected: Under 16</strong><br /><span className="text-slate-400 text-xs">Question 2 of 11: How long active in STB community?</span></span>}
            time="4:01 AM"
            delay={300}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard preview ────────────────────────────────────────────────────────
function DashboardPreview() {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0) scale(1)' : 'translateX(30px) scale(0.97)',
        transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
      }}
    >
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/8" style={{ background: '#0f172a' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0e1a] border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg overflow-hidden">
              <img src="/nexus_logo.png" alt="NM" className="w-full h-full object-cover" />
            </div>
            <span className="text-white text-xs font-bold">Nexus Dashboard</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
        </div>
        <div className="flex" style={{ height: '320px' }}>
          {/* Sidebar */}
          <div className="w-40 bg-[#0a0e1a] border-r border-white/5 flex flex-col py-3 px-2 gap-1">
            {[
              { label: 'Dashboard', icon: '📊', active: true },
              { label: 'Tickets', icon: '🎫', active: false },
              { label: 'Users', icon: '👥', active: false },
              { label: 'Giveaways', icon: '🎁', active: false },
              { label: 'Settings', icon: '⚙️', active: false },
              { label: 'Premium', icon: '💎', active: false },
            ].map(item => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${item.active ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 p-4 overflow-hidden">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Members', value: '1,247', icon: '👥', color: 'blue' },
                { label: 'Tickets', value: '34', icon: '🎫', color: 'purple' },
                { label: 'Premium', value: 'Active', icon: '💎', color: 'yellow' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center border border-white/5">
                  <div className="text-lg mb-1">{s.icon}</div>
                  <div className="text-white text-xs font-bold">{s.value}</div>
                  <div className="text-slate-500 text-[9px] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5">
              <div className="text-slate-400 text-[10px] mb-2 font-medium">Activity (7 days)</div>
              <div className="flex items-end gap-1.5 h-16">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(to top, rgba(239,68,68,0.8), rgba(239,68,68,0.3))`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────
function PricingCard({ name, price, period, badge, features, cta, featured }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
      className={`relative rounded-2xl p-7 border transition-all duration-300 ${
        featured
          ? 'bg-gradient-to-b from-red-500/10 to-slate-900/80 border-red-500/40 shadow-2xl shadow-red-500/10 scale-105'
          : 'bg-slate-800/30 border-white/8 hover:border-white/15'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/30">
          {badge}
        </div>
      )}
      <div className="mb-6">
        <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">{name}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-white">{price}</span>
          <span className="text-slate-500 text-sm">{period}</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map(f => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${featured ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <a
        href={cta.href}
        target={cta.external ? '_blank' : undefined}
        rel={cta.external ? 'noreferrer' : undefined}
        className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
          featured
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5'
            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white hover:-translate-y-0.5'
        }`}
      >
        {cta.label}
      </a>
    </div>
  );
}
