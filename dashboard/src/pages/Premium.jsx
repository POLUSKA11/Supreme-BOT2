import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    color: 'from-slate-600 to-slate-700',
    borderColor: 'border-slate-600/30',
    glowColor: '',
    badge: null,
    features: [
      { text: 'Basic bot commands', included: true },
      { text: '1 Ticket panel', included: true },
      { text: '5 Giveaways / month', included: true },
      { text: 'Basic welcome messages', included: true },
      { text: 'Community support', included: true },
      { text: 'Custom embed colors', included: false },
      { text: 'AI Assistant', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    period: '/month',
    color: 'from-red-600 to-purple-600',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
    badge: 'POPULAR',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Unlimited ticket panels', included: true },
      { text: 'Unlimited giveaways', included: true },
      { text: 'Custom welcome embeds', included: true },
      { text: 'Auto-role management', included: true },
      { text: 'Custom embed colors', included: true },
      { text: 'Audit log exports', included: true },
      { text: 'Priority support', included: true },
      { text: 'AI Assistant (limited)', included: true },
    ]
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 9.99,
    period: '/month',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/20',
    badge: 'BEST VALUE',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'AI Assistant (unlimited)', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Custom bot branding', included: true },
      { text: 'Multiple ticket panels', included: true },
      { text: 'Transcript exports (PDF)', included: true },
      { text: 'Staff verification system', included: true },
      { text: 'Custom commands', included: true },
      { text: 'Dedicated support channel', included: true },
    ]
  }
];

// Payment method SVG logos
const PayPalLogo = () => (
  <svg viewBox="0 0 124 33" className="h-6">
    <path fill="#253B80" d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"/>
    <path fill="#179BD7" d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z" fill="#179BD7"/>
    <path fill="#253B80" d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"/>
    <path fill="#179BD7" d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"/>
    <path fill="#222D65" d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.294-.516z"/>
  </svg>
);

export default function Premium({ selectedGuild }) {
  const { t } = useTranslation();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  const fetchPremiumStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPremiumStatus(data);
        setCurrentPlan(data.plan || 'free');
      }
    } catch (e) {
      console.error('Failed to fetch premium status:', e);
    }
  }, []);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  // Load PayPal SDK
  useEffect(() => {
    if (showPaymentModal && !paypalLoaded) {
      const script = document.createElement('script');
      // Replace with your actual Client ID or use a placeholder
      const clientId = 'YOUR_PAYPAL_CLIENT_ID'; 
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.async = true;
      script.onload = () => setPaypalLoaded(true);
      document.body.appendChild(script);
    }
  }, [showPaymentModal, paypalLoaded]);

  // Render PayPal buttons when modal is open and SDK is loaded
  useEffect(() => {
    if (showPaymentModal && paypalLoaded && selectedPlan) {
      const container = document.getElementById('paypal-button-container');
      if (container && container.innerHTML === '') {
        window.paypal.Buttons({
          createOrder: async () => {
            const res = await fetch('/api/payments/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan: selectedPlan.id }),
              credentials: 'include'
            });
            const data = await res.json();
            return data.id;
          },
          onApprove: async (data) => {
            setProcessing(true);
            const res = await fetch('/api/payments/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: data.orderID }),
              credentials: 'include'
            });
            const result = await res.json();
            if (result.success) {
              setShowPaymentModal(false);
              fetchPremiumStatus();
              alert('Premium activated successfully! Enjoy your new features.');
            } else {
              alert('Payment failed: ' + result.error);
            }
            setProcessing(false);
          },
          onError: (err) => {
            console.error('PayPal Error:', err);
            alert('An error occurred with PayPal. Please try again.');
          }
        }).render('#paypal-button-container');
      }
    }
  }, [showPaymentModal, paypalLoaded, selectedPlan, fetchPremiumStatus]);

  const handleSelectPlan = (plan) => {
    if (plan.id === 'free' || plan.id === currentPlan) return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full mb-6">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
          <span className="text-amber-400 text-sm font-bold">PREMIUM</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
          Upgrade to <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Premium</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Unlock the full power of Nexus Bot with premium features, unlimited access, and priority support.
        </p>
      </div>

      {/* Current Plan Badge */}
      {currentPlan !== 'free' && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-red-600/20 to-purple-600/20 border border-red-500/30 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
            <span className="text-white font-medium">Current Plan: <span className="text-red-400 font-bold capitalize">{currentPlan}</span></span>
            {premiumStatus?.expiresAt && (
              <span className="text-slate-400 text-sm ml-2">Expires {new Date(premiumStatus.expiresAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-slate-800/50 backdrop-blur-xl rounded-3xl border ${plan.borderColor} p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${plan.glowColor} ${
              plan.badge === 'POPULAR' ? 'ring-2 ring-red-500/50' : ''
            }`}
          >
            {plan.badge && (
              <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${plan.color} shadow-lg`}>
                {plan.badge}
              </div>
            )}

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                {plan.price === 0 ? (
                  <span className="text-4xl font-bold text-white">Free</span>
                ) : (
                  <>
                    <span className="text-lg text-slate-400">$</span>
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  {feature.included ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                  )}
                  <span className={`text-sm ${feature.included ? 'text-slate-300' : 'text-slate-500'}`}>{feature.text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={plan.id === currentPlan || plan.id === 'free'}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                plan.id === currentPlan
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : plan.id === 'free'
                  ? 'bg-slate-700/50 text-slate-400 cursor-default'
                  : `bg-gradient-to-r ${plan.color} text-white hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02]`
              }`}
            >
              {plan.id === currentPlan ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* PayPal Checkout Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${selectedPlan.color}`} />

              <div className="p-8">
                <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="text-center mb-8">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r ${selectedPlan.color} mb-4`}>
                    {selectedPlan.name.toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Complete Payment</h2>
                  <p className="text-slate-400">
                    <span className="text-white font-bold text-3xl">${selectedPlan.price}</span>
                    <span className="text-slate-400">{selectedPlan.period}</span>
                  </p>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                  {!paypalLoaded ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-400 text-sm">Loading PayPal...</p>
                    </div>
                  ) : (
                    <div id="paypal-button-container"></div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Secured with 256-bit SSL encryption
                </div>

                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-3 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-white font-bold">Processing Payment...</p>
            <p className="text-slate-400 text-sm mt-2">Please do not close this window.</p>
          </div>
        </div>
      )}
    </div>
  );
}
