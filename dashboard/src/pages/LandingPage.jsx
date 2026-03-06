import { useState, useEffect } from 'react';
import { ArrowRight, Shield, Zap, MessageSquare, Gift, Users, Star } from 'lucide-react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [stats, setStats] = useState({ guilds: 0, users: 0, premium: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch real stats from backend
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setStats({
            guilds: data.totalGuilds || 0,
            users: data.totalUsers || 0,
            premium: data.premiumCount || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handleAddToDiscord = () => {
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_BOT_CLIENT_ID || '1234567890'}&permissions=8&scope=bot%20applications.commands`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/50">
              <span className="font-bold text-lg">⚡</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Supreme<span className="text-red-400">BOT2</span></span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard/login" className="text-slate-300 hover:text-white transition-colors">Dashboard</a>
            <button
              onClick={handleAddToDiscord}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg font-semibold transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
            >
              Add to Discord
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-red-500/10 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-10"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-black leading-tight">
                Unleash the <span className="bg-gradient-to-r from-red-400 via-red-500 to-orange-400 bg-clip-text text-transparent">Ultimate Discord</span> Experience
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                Supreme-BOT2 is the next-generation Discord bot, empowering your community with unparalleled moderation, AI-driven insights, and seamless server management. Built for performance and designed for engagement.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAddToDiscord}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-bold text-lg transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 flex items-center justify-center gap-2"
              >
                <span>Add to Discord</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-lg transition-all"
              >
                Explore Features
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-red-400">{(stats.guilds / 1000).toFixed(1)}K+</p>
                <p className="text-sm text-slate-400">Servers</p>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-red-400">{(stats.users / 1000000).toFixed(1)}M+</p>
                <p className="text-sm text-slate-400">Users</p>
              </div>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-red-400">{(stats.premium / 1000).toFixed(1)}K+</p>
                <p className="text-sm text-slate-400">Premium</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative h-96 lg:h-full flex items-center justify-center">
            <img
              src="/hero_visual.png"
              alt="Supreme-BOT2"
              className="w-full h-full object-contain drop-shadow-2xl"
              style={{
                transform: `translateY(${scrollY * 0.3}px)`,
                transition: 'transform 0.1s ease-out',
              }}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-4">Powerful Features</h2>
            <p className="text-xl text-slate-300">Everything you need to manage, protect, and grow your Discord server</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature Cards */}
            {[
              {
                icon: Shield,
                title: 'Advanced Moderation',
                description: 'Intelligent spam detection and anti-raid protection to keep your server safe.',
                image: '/feature_moderation.png',
              },
              {
                icon: Zap,
                title: 'AI-Powered Insights',
                description: 'Leverage AI to understand and engage your community like never before.',
                image: '/feature_ai.png',
              },
              {
                icon: MessageSquare,
                title: 'Ticket System',
                description: 'Professional support management for efficient member communication.',
                image: '/feature_tickets.png',
              },
              {
                icon: Gift,
                title: 'Dynamic Giveaways',
                description: 'Create exciting contests and reward your loyal community members.',
                image: '/feature_giveaways.png',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-6 hover:border-red-500/50 transition-all hover:shadow-lg hover:shadow-red-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-red-500/10 rounded-2xl transition-all"></div>
                <div className="relative z-10 space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                    {feature.image ? (
                      <img src={feature.image} alt={feature.title} className="w-12 h-12 object-contain" />
                    ) : (
                      <feature.icon className="w-8 h-8 text-red-400" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-4">Loved by Server Owners</h2>
            <p className="text-xl text-slate-300">Join thousands of satisfied communities</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                text: 'Supreme-BOT2 transformed our server\'s moderation. The anti-raid features are a game-changer!',
                author: 'Server Admin',
                role: 'Gaming Community',
              },
              {
                text: 'The AI integration is mind-blowing. It helps us understand our community\'s needs and respond effectively.',
                author: 'Community Manager',
                role: 'Tech Discord',
              },
              {
                text: 'Finally, a ticket system that just works. Our support team is more efficient than ever.',
                author: 'Server Owner',
                role: 'Support Community',
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-8 hover:border-red-500/50 transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-bold">{testimonial.author}</p>
                  <p className="text-sm text-slate-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-950/50 to-slate-950/50 border-t border-b border-white/10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-black">Ready to Revolutionize Your Server?</h2>
          <p className="text-xl text-slate-300">Join thousands of satisfied server owners who trust Supreme-BOT2 to deliver an exceptional Discord experience.</p>
          <button
            onClick={handleAddToDiscord}
            className="px-10 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl font-bold text-lg transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 inline-flex items-center gap-2"
          >
            <span>Add Supreme-BOT2 Now</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support Server</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Follow</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-slate-500 text-sm">
            <p>&copy; 2026 Supreme-BOT2. All rights reserved. Built with ⚡ by Manus AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
