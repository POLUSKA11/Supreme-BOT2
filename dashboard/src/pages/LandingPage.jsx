import { useState, useEffect, useRef } from 'react';

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

function StatCard({ value, label, suffix = '', start }) {
  const count = useCountUp(value, 2200, start);
  return (
    <div className="text-center">
      <div className="text-5xl md:text-6xl font-black text-white tabular-nums tracking-tight">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-[0.15em]">{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, delay = 0 }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
      className="group relative bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-red-500/10 hover:border-red-500/30 rounded-2xl p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/0 group-hover:from-red-500/3 group-hover:to-red-500/5 rounded-2xl transition-all duration-500" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 group-hover:from-red-500/30 group-hover:to-red-600/20 group-hover:border-red-500/40 transition-all duration-300">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  const [ref, inView] = useInView(0.2);
  return (
    <div
      ref={ref}
      className="text-center max-w-3xl mx-auto mb-16"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {eyebrow && (
        <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-red-500 mb-4 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
          {eyebrow}
        </span>
      )}
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-5">
        {title}
      </h2>
      {subtitle && <p className="text-slate-400 text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

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

  const features = [
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
      title: 'Elite Moderation',
      description: 'Advanced anti-raid, auto-mod, link filtering, spam detection, and comprehensive audit logs to keep your server safe 24/7.',
      delay: 0,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
      title: 'Middleman Services',
      description: 'Secure, verified middleman application system with DM questionnaires, staff review, and transaction logging.',
      delay: 100,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
      title: 'Leveling System',
      description: 'Engage your community with XP-based leveling, custom rank cards, leaderboards, and role rewards.',
      delay: 200,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
      title: 'Giveaway Manager',
      description: 'Create, manage, and auto-end giveaways with role requirements, winner selection, and re-roll.',
      delay: 300,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
      title: 'AI Assistant',
      description: 'Powered by advanced AI, Nexus can answer questions, analyze prices, and provide personalized server assistance.',
      delay: 400,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z"/></svg>,
      title: 'Ticket System',
      description: 'Professional support tickets with categories, transcripts, staff assignment, and full dashboard management.',
      delay: 500,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
      title: 'Invite Tracking',
      description: 'Track who invited whom, manage fake invites, bonus invites, and display detailed invite leaderboards.',
      delay: 600,
    },
    {
      Icon: () => <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
      title: 'Web Dashboard',
      description: 'Manage everything from a beautiful, responsive dashboard. Configure settings, view stats, and control your bot.',
      delay: 700,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-red-500/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-red-600/4 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{
          background: scrollY > 60 ? 'rgba(0,0,0,0.8)' : 'transparent',
          backdropFilter: scrollY > 60 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 60 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between relative z-10">
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow duration-300">
              <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black tracking-tight">Nexus<span className="text-red-500">Bot</span></span>
          </a>

          <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Premium', href: '#premium' },
            ].map(l => (
              <li key={l.label}>
                <a href={l.href} className="text-slate-400 hover:text-white text-sm font-semibold transition-colors duration-200">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <a href="/dashboard/login" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors px-4 py-2">
              Login
            </a>
            <a
              href={BOT_INVITE}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Add to Discord
            </a>
          </div>

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

        {menuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/5">
            <div className="px-4 py-4 flex flex-col gap-3">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Premium', href: '#premium' },
                { label: 'Dashboard', href: '/dashboard/login' },
              ].map(l => (
                <a key={l.label} href={l.href} className="py-2.5 text-slate-300 hover:text-white font-semibold text-sm border-b border-white/5 last:border-0" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </a>
              ))}
              <a href={BOT_INVITE} target="_blank" rel="noreferrer" className="mt-2 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg text-center transition-colors">
                Add to Discord
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div
              style={{
                opacity: heroInView ? 1 : 0,
                transform: heroInView ? 'translateY(0)' : 'translateY(50px)',
                transition: 'opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s',
              }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                The #1 Discord Bot for Trading Communities
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[1.05] mb-8">
                The <span className="text-red-500">Ultimate</span> Discord Bot <span className="text-red-500">Experience</span>
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-lg">
                Nexus powers your community with elite moderation, middleman services, AI-driven insights, leveling, giveaways, and a stunning web dashboard. Built for performance. Designed for growth.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a
                  href={BOT_INVITE}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-lg transition-all duration-200 shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-1 active:translate-y-0"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Add to Discord — Free
                </a>
                <a
                  href="/dashboard/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-base rounded-lg transition-all duration-200 hover:-translate-y-1 active:translate-y-0"
                >
                  Open Dashboard
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              </div>

              <div className="flex flex-wrap gap-6 text-slate-500 text-sm">
                {[
                  { icon: '🛡️', text: 'Trusted & Secure' },
                  { icon: '⚡', text: '99.9% Uptime' },
                  { icon: '🕐', text: '24/7 Active' },
                ].map(t => (
                  <div key={t.text} className="flex items-center gap-2">
                    <span className="text-lg">{t.icon}</span>
                    <span className="font-semibold">{t.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual */}
            <div
              style={{
                opacity: heroInView ? 1 : 0,
                transform: heroInView ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)',
                transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s',
              }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-red-600/20">
                <div className="bg-gradient-to-br from-slate-900 to-black p-6">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-slate-400 text-xs ml-2 font-medium"># middleman</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">NM</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">NexusBot</span>
                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">BOT</span>
                        </div>
                        <p className="text-slate-300 text-sm">✅ <strong>Middleman session started!</strong> Both parties verified. Trade safely.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold">S</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">Supreme</span>
                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">MM</span>
                        </div>
                        <p className="text-slate-300 text-sm">I'll be your middleman. Please confirm your items.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold">F</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">FocusedOVP</span>
                        </div>
                        <p className="text-slate-300 text-sm">Confirmed! Sending 500 V-Bucks now.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="relative py-20 border-y border-white/5" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatCard value={stats.guilds} label="Servers" suffix="+" start={statsInView} />
            <StatCard value={stats.users} label="Members Served" suffix="+" start={statsInView} />
            <StatCard value={stats.premium} label="Premium Servers" start={statsInView} />
            <StatCard value={99} label="Uptime %" suffix="%" start={statsInView} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow="Everything you need"
            title={<>Packed with <span className="text-red-500">Powerful</span> Features</>}
            subtitle="From elite moderation to AI-powered tools, Nexus has everything your Discord community needs to thrive."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Premium Section */}
      <section id="premium" className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-red-600/5 to-transparent" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow="Premium"
            title={<>Unlock <span className="text-red-500">Premium</span> Power</>}
            subtitle="Take your server to the next level with exclusive features, priority support, and advanced customization."
          />

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: '/mo',
                features: ['Moderation commands', 'Basic leveling', 'Invite tracking', 'Ticket system', 'Giveaways', 'Web dashboard access'],
                featured: false,
              },
              {
                name: 'Pro',
                price: '$4.99',
                period: '/mo',
                badge: 'Most Popular',
                features: ['Everything in Free', 'Custom bot avatar', 'Custom bot banner', 'Custom bot bio', 'Priority support', 'Advanced analytics', 'Unlimited tickets'],
                featured: true,
              },
              {
                name: 'Ultimate',
                price: '$9.99',
                period: '/mo',
                features: ['Everything in Pro', 'AI assistant access', 'Custom commands', 'White-label branding', 'Dedicated support', 'Early access features', 'API access'],
                featured: false,
              },
            ].map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                  plan.featured
                    ? 'bg-gradient-to-b from-red-600/10 to-red-600/5 border-red-500/30 shadow-2xl shadow-red-600/10 ring-1 ring-red-500/20 scale-105'
                    : 'bg-slate-900/50 border-white/10 hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg shadow-red-600/30">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-8">
                  <div className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-10">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${plan.featured ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.name === 'Free' ? BOT_INVITE : '/dashboard/login'}
                  target={plan.name === 'Free' ? '_blank' : undefined}
                  rel={plan.name === 'Free' ? 'noreferrer' : undefined}
                  className={`block w-full text-center py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
                    plan.featured
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white hover:-translate-y-0.5'
                  }`}
                >
                  {plan.name === 'Free' ? 'Add for Free' : `Get ${plan.name}`}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-red-500/20 p-12 md:p-16 text-center">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.1) 0%, rgba(0,0,0,0.8) 70%)' }} />
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
                Ready to power up<br />your server?
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
                Join thousands of Discord communities already using Nexus. Free forever, premium when you need it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={BOT_INVITE}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-200 shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Add Nexus to Discord
                </a>
                <a
                  href="/dashboard/login"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-lg transition-all duration-200 hover:-translate-y-1"
                >
                  Open Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1, background: 'rgba(0,0,0,0.5)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden">
                  <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
                </div>
                <span className="text-white font-black text-xl">NexusBot</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                The ultimate Discord bot for trading communities. Secure, powerful, and always online.
              </p>
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
                heading: 'Support',
                links: [
                  { label: 'Documentation', href: '#' },
                  { label: 'Support Server', href: '#' },
                  { label: 'Contact', href: '#' },
                ],
              },
              {
                heading: 'Legal',
                links: [
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Terms of Service', href: '#' },
                ],
              },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{col.heading}</h4>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <a href={l.href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                        {l.label}
                      </a>
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

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
