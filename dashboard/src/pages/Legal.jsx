import React, { useEffect } from 'react';

const LegalPage = ({ title, content }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500/30">
      {/* Navbar Placeholder */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-red-500/20">
              <img src="/nexus_logo.png" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">Nexus<span className="text-red-500">Bot</span></span>
          </a>
          <a href="/" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors">Back to Home</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-32 pb-24">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-12">{title}</h1>
        <div className="prose prose-invert prose-red max-w-none">
          {content}
        </div>
      </div>

      <footer className="border-t border-white/5 py-12 px-4 bg-black/50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-600 text-sm">© {new Date().getFullYear()} NexusBot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export const PrivacyPolicy = () => (
  <LegalPage 
    title="Privacy Policy" 
    content={
      <div className="space-y-8 text-slate-400 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Data Collection</h2>
          <p>NexusBot collects minimal data necessary for its operation. This includes Discord User IDs, Server IDs, and configuration settings provided by server administrators. We do not collect personal real-world information unless explicitly provided through support channels.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Usage of Data</h2>
          <p>The data collected is used solely to provide and improve our services, such as maintaining leveling statistics, managing tickets, and enforcing moderation settings. We do not sell or trade your data to third parties.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Data Retention</h2>
          <p>Configuration data is stored for as long as the bot is present in your server. User-specific data (like leveling XP) can be cleared upon request by server administrators or by the user leaving the server, depending on server settings.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Security</h2>
          <p>We implement industry-standard security measures to protect your data stored in our databases. However, no method of transmission over the internet is 100% secure.</p>
        </section>
      </div>
    } 
  />
);

export const TermsOfService = () => (
  <LegalPage 
    title="Terms of Service" 
    content={
      <div className="space-y-8 text-slate-400 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
          <p>By adding NexusBot to your server or using our dashboard, you agree to comply with these Terms of Service and all applicable laws and regulations.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. Usage License</h2>
          <p>We grant you a limited, non-exclusive, non-transferable license to use NexusBot for your community management needs. You may not use the bot for any illegal purposes or to violate Discord's Terms of Service.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Premium Subscriptions</h2>
          <p>Premium features are provided on a subscription basis. All payments are processed securely through third-party providers. Subscriptions can be cancelled at any time through the dashboard.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. Disclaimer</h2>
          <p>NexusBot is provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability.</p>
        </section>
      </div>
    } 
  />
);

export const CookiePolicy = () => (
  <LegalPage 
    title="Cookie Policy" 
    content={
      <div className="space-y-8 text-slate-400 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. What are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and keep you logged into the dashboard.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. How we use Cookies</h2>
          <p>We use essential cookies to maintain your session and security. We may also use analytical cookies to understand how users interact with our dashboard to improve the experience.</p>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. Managing Cookies</h2>
          <p>You can choose to disable cookies through your browser settings, but please note that the dashboard will not function correctly without essential session cookies.</p>
        </section>
      </div>
    } 
  />
);
