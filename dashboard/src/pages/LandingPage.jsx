import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Safe count-up hook with validation
function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || !target || isNaN(target) || target <= 0) return;
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

// Intersection Observer hook for scroll animations
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

// Individual Stat Card
function StatCard({ value, label, suffix = '', start }) {
  const countValue = parseInt(value) || 0;
  const count = useCountUp(countValue, 2200, start);
  return (
    <div className="text-center">
      <div className="text-5xl md:text-6xl font-black text-white tabular-nums tracking-tight">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-[0.15em]">{label}</div>
    </div>
  );
}

// ICON MAPPING OBJECT - TO AVOID RENDER ERRORS
const ICON_COMPONENTS = {
  shield: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  users: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  lightning: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  gift: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  brain: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ticket: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" />
    </svg>
  ),
  userCheck: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  home: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  fallback: () => (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
};

// Stable Feature Card
function FeatureCard({ iconKey, title, description, delay = 0 }) {
  const [ref, inView] = useInView(0.15);
  // Defensively get the icon component or fallback
  const IconComponent = ICON_COMPONENTS[iconKey] || ICON_COMPONENTS.fallback;

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
          <IconComponent />
        </div>
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Section Heading component
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
    // Silently fetch stats to avoid crashing if 401 occurs
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === 'object') {
            setStats({
              guilds: parseInt(data.totalGuilds) || 12,
              users: parseInt(data.totalUsers) || 5000,
              premium: parseInt(data.premiumCount) || 3,
            });
          }
        }
      } catch (err) {
        // Silently fail
      }
    };
    fetchStats();
  }, []);

  const BOT_INVITE = `https://discord.com/oauth2/authorize?client_id=1459183931005075701&permissions=8&scope=bot%20applications.commands`;

  const featuresData = [
    { iconKey: 'shield', title: 'Elite Moderation', description: 'Advanced anti-raid, auto-mod, link filtering, and spam detection to keep your server safe 24/7.', delay: 0 },
    { iconKey: 'users', title: 'Middleman Services', description: 'Secure, verified middleman system with DM questionnaires and staff review.', delay: 100 },
    { iconKey: 'lightning', title: 'Leveling System', description: 'Engage your community with XP-based leveling, custom rank cards, and role rewards.', delay: 200 },
    { iconKey: 'gift', title: 'Giveaway Manager', description: 'Create and manage giveaways with role requirements and winner selection.', delay: 300 },
    { iconKey: 'brain', title: 'AI Assistant', description: 'Powered by advanced AI, Nexus can answer questions and provide server assistance.', delay: 400 },
    { iconKey: 'ticket', title: 'Ticket System', description: 'Professional support tickets with transcripts and staff assignment.', delay: 500 },
    { iconKey: 'userCheck', title: 'Invite Tracking', description: 'Track who invited whom and manage detailed invite leaderboards.', delay: 600 },
    { iconKey: 'home', title: 'Web Dashboard', description: 'Manage everything from a beautiful, responsive web-based control panel.', delay: 700 },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500/30">
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
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow duration-300">
              <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black tracking-tight">Nexus<span className="text-red-500">Bot</span></span>
          </Link>

          <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
            <li><a href="#features" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors duration-200">Features</a></li>
            <li><a href="#premium" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors duration-200">Premium</a></li>
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/dashboard/login" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors px-4 py-2">Login</Link>
            <a href={BOT_INVITE} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5">
              Add to Discord
            </a>
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 flex flex-col gap-1.5">
              <span className={`block h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex flex-col gap-3 z-50">
            <a href="#features" className="text-slate-300 hover:text-white text-sm font-semibold py-2 transition-colors" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#premium" className="text-slate-300 hover:text-white text-sm font-semibold py-2 transition-colors" onClick={() => setMenuOpen(false)}>Premium</a>
            <Link to="/dashboard/login" className="text-slate-300 hover:text-white text-sm font-semibold py-2 transition-colors" onClick={() => setMenuOpen(false)}>Login</Link>
            <a href={BOT_INVITE} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-all duration-200" onClick={() => setMenuOpen(false)}>
              Add to Discord
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div style={{ opacity: heroInView ? 1 : 0, transform: heroInView ? 'translateY(0)' : 'translateY(50px)', transition: 'opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                The #1 Discord Bot for Trading Communities
              </div>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[1.05] mb-8">
                The <span className="text-red-500">Ultimate</span> Discord Bot <span className="text-red-500">Experience</span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-lg">
                Nexus powers your community with elite moderation, middleman services, leveling, giveaways, and a stunning web dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={BOT_INVITE} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-lg transition-all duration-200 shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-1">
                  Add to Discord — Free
                </a>
                <Link to="/dashboard/login" className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-base rounded-lg transition-all duration-200 hover:-translate-y-1">
                  Open Dashboard
                </Link>
              </div>
            </div>

            <div style={{ opacity: heroInView ? 1 : 0, transform: heroInView ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.97)', transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s' }} className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-red-600/20 bg-slate-900/80 p-6">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                  <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><div className="w-3 h-3 rounded-full bg-yellow-500" /><div className="w-3 h-3 rounded-full bg-green-500" /></div>
                  <span className="text-slate-400 text-xs ml-2 font-medium"># middleman</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold">NM</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-white">NexusBot</span><span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">BOT</span></div>
                      <p className="text-slate-300 text-sm">✅ **Middleman session started!** Both parties verified. Trade safely.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">F</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-white">FocusedOVP</span></div>
                      <p className="text-slate-300 text-sm">Confirmed! Sending items now.</p>
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
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <StatCard value={stats.guilds} label="Servers" suffix="+" start={statsInView} />
          <StatCard value={stats.users} label="Members Served" suffix="+" start={statsInView} />
          <StatCard value={stats.premium} label="Premium Servers" start={statsInView} />
          <StatCard value={99} label="Uptime %" suffix="%" start={statsInView} />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow="Everything you need" title={<>Packed with <span className="text-red-500">Powerful</span> Features</>} subtitle="Nexus has everything your Discord community needs to thrive." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuresData.map(f => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* Premium Section */}
      <section id="premium" className="relative py-32 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow="Premium" title={<>Unlock <span className="text-red-500">Premium</span> Power</>} subtitle="Take your server to the next level with exclusive features." />
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {['Free', 'Pro', 'Ultimate'].map((plan, i) => (
              <div key={plan} className={`relative rounded-2xl p-8 border transition-all duration-300 ${i === 1 ? 'bg-red-600/10 border-red-500/30 scale-105 shadow-2xl shadow-red-600/10' : 'bg-slate-900/50 border-white/10'}`}>
                {i === 1 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-white text-xs font-bold rounded-full">Most Popular</div>}
                <div className="mb-8">
                  <div className="text-slate-400 text-xs font-bold uppercase mb-2">{plan}</div>
                  <div className="flex items-baseline gap-1"><span className="text-5xl font-black text-white">${i === 0 ? '0' : i === 1 ? '4.99' : '9.99'}</span><span className="text-slate-500 text-sm">/mo</span></div>
                </div>
                <ul className="space-y-3 mb-10 text-sm text-slate-300">
                  <li>✓ Moderation commands</li>
                  <li>✓ Leveling system</li>
                  <li>✓ Web dashboard</li>
                  {i > 0 && <li>✓ Custom branding</li>}
                  {i > 1 && <li>✓ AI Assistant access</li>}
                </ul>
                <a href={i === 0 ? BOT_INVITE : '/dashboard/login'} className={`block w-full text-center py-3 rounded-lg font-bold text-sm transition-all ${i === 1 ? 'bg-red-600 text-white shadow-lg' : 'bg-white/5 text-white border border-white/10'}`}>
                  {i === 0 ? 'Add for Free' : `Get ${plan}`}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-16 px-4 bg-black/50" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden"><img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" /></div>
                <span className="text-white font-black text-xl">NexusBot</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">The ultimate Discord bot for trading communities. Secure, powerful, and always online.</p>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#premium" className="hover:text-white transition-colors">Premium</a></li>
                <li><Link to="/dashboard/login" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#" className="hover:text-white transition-colors">Support Server</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-slate-600 text-sm">© {new Date().getFullYear()} NexusBot. All rights reserved.</span>
            <span className="text-slate-600 text-sm">Made with ❤️ for the community</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
