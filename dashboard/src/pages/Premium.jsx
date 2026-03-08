import { useState, useEffect, useCallback, useRef } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import Toast from '../components/Toast.jsx';

// ─── Plan Data ────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    color: 'from-slate-600 to-slate-700',
    borderColor: 'border-slate-600/30',
    glowColor: 'shadow-slate-500/10',
    features: [
      { text: 'Basic ticket system (1 panel)', included: true },
      { text: 'Up to 5 giveaways/month', included: true },
      { text: 'Basic welcome messages', included: true },
      { text: 'Standard support', included: true },
      { text: 'Unlimited ticket panels', included: false },
      { text: 'Custom welcome embeds', included: false },
      { text: 'AI Assistant', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    period: '/month',
    color: 'from-red-500 to-rose-600',
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
    ],
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
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Expired';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="ml-2 px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CountdownTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());
  useEffect(() => {
    const interval = setInterval(() => setRemaining(expiresAt - Date.now()), 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return <span>{formatCountdown(remaining)}</span>;
}

// ─── Main Component ───────────────────────────────────────────
export default function Premium() {
  const [toast, setToast]             = useState(null);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [config, setConfig]           = useState(null);
  const [trialStatus, setTrialStatus] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('paypal'); // 'paypal' | 'crypto'
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [cryptoOrder, setCryptoOrder] = useState(null);
  const [cryptoCoins, setCryptoCoins] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);
  const pollRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Load config and status ─────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [configRes, statusRes, trialRes] = await Promise.all([
          fetch('/api/payments/config', { credentials: 'include' }),
          fetch('/api/payments/status', { credentials: 'include' }),
          fetch('/api/payments/trial/status', { credentials: 'include' }),
        ]);
        if (configRes.ok)  setConfig(await configRes.json());
        if (statusRes.ok)  setPremiumStatus(await statusRes.json());
        if (trialRes.ok)   setTrialStatus(await trialRes.json());
      } catch (err) {
        console.error('Failed to load premium data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Load crypto coins when crypto tab selected ─────────────
  useEffect(() => {
    if (paymentMethod === 'crypto' && cryptoCoins.length === 0) {
      fetch('/api/payments/crypto/coins', { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          if (d.coins) {
            setCryptoCoins(d.coins);
            if (d.coins.length > 0) setSelectedCoin(d.coins[0].key);
          }
        })
        .catch(console.error);
    }
  }, [paymentMethod, cryptoCoins.length]);

  // ─── Poll crypto payment status ─────────────────────────────
  const startPolling = useCallback((orderId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/crypto/check/${orderId}`, { credentials: 'include' });
        const data = await res.json();
        if (data.confirmed) {
          clearInterval(pollRef.current);
          setCryptoOrder(null);
          setSelectedPlan(null);
          showToast('Payment confirmed! Premium activated!', 'success');
          // Reload premium status
          const statusRes = await fetch('/api/payments/status', { credentials: 'include' });
          if (statusRes.ok) setPremiumStatus(await statusRes.json());
        } else if (data.status === 'expired') {
          clearInterval(pollRef.current);
          showToast('Payment order expired. Please create a new order.', 'error');
          setCryptoOrder(null);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 15000); // Poll every 15 seconds
    setPollInterval(pollRef.current);
  }, [showToast]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ─── Start Trial ────────────────────────────────────────────
  const startTrial = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/payments/trial/start', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setPremiumStatus({ isPremium: true, plan: 'pro', expiresAt: data.expiresAt });
        setTrialStatus({ eligible: false, usedTrial: true });
      } else {
        showToast(data.error || 'Failed to start trial', 'error');
      }
    } catch {
      showToast('Failed to start trial', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Create Crypto Order ─────────────────────────────────────
  const createCryptoOrder = async () => {
    if (!selectedPlan || !selectedCoin) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/payments/crypto/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, coin: selectedCoin }),
      });
      const data = await res.json();
      if (res.ok) {
        setCryptoOrder(data);
        startPolling(data.orderId);
      } else {
        showToast(data.error || 'Failed to create crypto order', 'error');
      }
    } catch {
      showToast('Failed to create crypto order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Submit TX Hash ──────────────────────────────────────────
  const [txHash, setTxHash] = useState('');
  const submitTxHash = async () => {
    if (!txHash.trim() || !cryptoOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/payments/crypto/manual-confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cryptoOrder.orderId, txHash: txHash.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Transaction hash submitted! Verifying...', 'info');
        setTxHash('');
      } else {
        showToast(data.error || 'Failed to submit', 'error');
      }
    } catch {
      showToast('Failed to submit transaction hash', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── PayPal Handlers ─────────────────────────────────────────
  const createPaypalOrder = async () => {
    const res = await fetch('/api/payments/paypal/create-order', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create order');
    return data.id;
  };

  const onPaypalApprove = async (data) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: data.orderID }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message || 'Premium activated!', 'success');
        setSelectedPlan(null);
        const statusRes = await fetch('/api/payments/status', { credentials: 'include' });
        if (statusRes.ok) setPremiumStatus(await statusRes.json());
      } else {
        showToast(result.error || 'Payment failed', 'error');
      }
    } catch {
      showToast('Failed to capture payment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Loading State ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          <p className="text-slate-400">Loading premium...</p>
        </div>
      </div>
    );
  }

  const isPremium = premiumStatus?.isPremium;
  const paypalEnabled = config?.paypal?.enabled;
  const cryptoEnabled = config?.crypto?.enabled;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-4">
            Premium Plans
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Upgrade Your Server</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Unlock powerful features for your Discord community. Cancel anytime.
          </p>
        </div>
      </div>

      {/* Active Premium Banner */}
      {isPremium && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl"></div>
              <div>
                <p className="text-white font-bold text-lg capitalize">
                  {premiumStatus.plan} Plan Active
                </p>
                <p className="text-amber-400/80 text-sm">
                  Expires: {formatDate(premiumStatus.expiresAt)} &nbsp;·&nbsp;
                  <CountdownTimer expiresAt={premiumStatus.expiresAt} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Active
              </span>
              {premiumStatus.paymentMethod && (
                <span className="bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full text-sm capitalize">
                  via {premiumStatus.paymentMethod.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Free Trial Banner */}
      {!isPremium && trialStatus?.eligible && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl"></div>
              <div>
                <p className="text-white font-bold text-lg">Free {trialStatus.trialDays}-Day Trial Available!</p>
                <p className="text-blue-400/80 text-sm">Try all Pro features for free — no payment required</p>
              </div>
            </div>
            <button
              onClick={startTrial}
              disabled={actionLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Starting...' : `Start Free Trial`}
            </button>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-[#12121a] border ${plan.borderColor} rounded-2xl p-6 flex flex-col shadow-xl ${plan.glowColor} transition-all duration-300 hover:scale-[1.02] ${
              selectedPlan === plan.id ? 'ring-2 ring-red-500' : ''
            }`}
          >
            {plan.badge && (
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${plan.color} text-white text-xs font-bold px-4 py-1 rounded-full`}>
                {plan.badge}
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-lg mb-4`}>
              {plan.id === 'free' ? '' : plan.id === 'pro' ? '' : ''}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-white">${plan.price}</span>
              <span className="text-slate-400 text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {f.included
                    ? <span className="text-green-400 flex-shrink-0">✓</span>
                    : <span className="text-slate-600 flex-shrink-0">✗</span>}
                  <span className={f.included ? 'text-slate-300' : 'text-slate-600'}>{f.text}</span>
                </li>
              ))}
            </ul>
            {plan.id === 'free' ? (
              <div className="text-center text-slate-500 text-sm py-2">Current free plan</div>
            ) : isPremium && premiumStatus.plan === plan.id ? (
              <div className="text-center bg-green-500/10 border border-green-500/20 text-green-400 text-sm py-2 rounded-xl">
                ✓ Active Plan
              </div>
            ) : (
              <button
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-bold py-2.5 rounded-xl transition-all`}
              >
                {isPremium ? 'Switch Plan' : 'Get Started'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-xl">Complete Your Purchase</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {PLANS.find(p => p.id === selectedPlan)?.name} Plan — ${PLANS.find(p => p.id === selectedPlan)?.price}/month
                </p>
              </div>
              <button
                onClick={() => { setSelectedPlan(null); setCryptoOrder(null); if (pollRef.current) clearInterval(pollRef.current); }}
                className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Payment Method Tabs */}
              <div className="flex gap-2 mb-6">
                {paypalEnabled && (
                  <button
                    onClick={() => { setPaymentMethod('paypal'); setCryptoOrder(null); }}
                    className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      paymentMethod === 'paypal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    PayPal
                  </button>
                )}
                {cryptoEnabled && (
                  <button
                    onClick={() => { setPaymentMethod('crypto'); setCryptoOrder(null); }}
                    className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      paymentMethod === 'crypto'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    Crypto
                  </button>
                )}
                {!paypalEnabled && !cryptoEnabled && (
                  <div className="w-full text-center text-slate-400 text-sm py-4">
                    No payment methods configured. Please contact the administrator.
                  </div>
                )}
              </div>

              {/* PayPal Payment */}
              {paymentMethod === 'paypal' && paypalEnabled && config?.paypal?.clientId && (
                <div>
                  <p className="text-slate-400 text-sm mb-4 text-center">
                    Securely pay with PayPal. You will be redirected to PayPal to complete payment.
                  </p>
                  <PayPalScriptProvider
                    options={{
                      'client-id': config.paypal.clientId,
                      currency: 'USD',
                      intent: 'capture',
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                      createOrder={createPaypalOrder}
                      onApprove={onPaypalApprove}
                      onError={(err) => {
                        console.error('PayPal error:', err);
                        showToast('PayPal error occurred. Please try again.', 'error');
                      }}
                      onCancel={() => showToast('Payment cancelled.', 'info')}
                    />
                  </PayPalScriptProvider>
                </div>
              )}

              {/* Crypto Payment */}
              {paymentMethod === 'crypto' && cryptoEnabled && (
                <div>
                  {!cryptoOrder ? (
                    <>
                      <p className="text-slate-400 text-sm mb-4">Select your preferred cryptocurrency:</p>
                      {cryptoCoins.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                          <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin mx-auto mb-3" />
                          Loading coins...
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2 mb-6">
                            {cryptoCoins.map((coin) => (
                              <button
                                key={coin.key}
                                onClick={() => setSelectedCoin(coin.key)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  selectedCoin === coin.key
                                    ? 'border-amber-500/50 bg-amber-500/10'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                  style={{ backgroundColor: coin.color + '30', color: coin.color }}
                                >
                                  {coin.icon}
                                </div>
                                <div className="text-left min-w-0">
                                  <p className="text-white text-xs font-semibold truncate">{coin.name}</p>
                                  <p className="text-slate-500 text-xs">{coin.network}</p>
                                  {coin.priceUsd && (
                                    <p className="text-slate-400 text-xs">${coin.priceUsd.toLocaleString()}</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={createCryptoOrder}
                            disabled={!selectedCoin || actionLoading}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                          >
                            {actionLoading ? 'Creating order...' : `Pay with ${selectedCoin ? cryptoCoins.find(c => c.key === selectedCoin)?.name : 'Crypto'}`}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    /* Crypto Order Details */
                    <div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4 text-center">
                        <p className="text-green-400 text-sm font-medium">
                          ⏱ Order expires in ~30 minutes — payment is auto-detected
                        </p>
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center mb-4">
                        <div className="bg-white p-3 rounded-xl inline-block">
                          <img
                            src={cryptoOrder.qrCode}
                            alt="Payment QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                      </div>

                      {/* Coin Badge */}
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="bg-white/5 border border-white/10 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {cryptoOrder.coinName} · {cryptoOrder.network}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-400 text-sm">Amount to send</span>
                          <span className="text-white font-bold text-lg">
                            {cryptoOrder.amountCrypto} {cryptoOrder.coin.replace('_TRC20', '').replace('_ERC20', '')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">USD equivalent</span>
                          <span className="text-slate-300 text-sm">${cryptoOrder.amountUsd}</span>
                        </div>
                      </div>

                      {/* Wallet Address */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                        <p className="text-slate-400 text-xs mb-2">Send {cryptoOrder.network} to this address:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-white text-xs font-mono break-all flex-1 bg-black/30 p-2 rounded-lg">
                            {cryptoOrder.address}
                          </code>
                          <CopyButton text={cryptoOrder.address} />
                        </div>
                      </div>

                      {/* Warning */}
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                        <p className="text-amber-400 text-xs">
                          ⚠️ Send <strong>exactly</strong> {cryptoOrder.amountCrypto} {cryptoOrder.coin.replace('_TRC20', '').replace('_ERC20', '')} on the <strong>{cryptoOrder.network}</strong> network. Sending the wrong amount or network may result in loss of funds.
                        </p>
                      </div>

                      {/* Auto-detection notice */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400/50 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />
                        <p className="text-blue-400 text-xs">
                          Automatically checking for your payment every 15 seconds...
                        </p>
                      </div>

                      {/* Manual TX Hash submission */}
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-slate-400 text-xs mb-2">Already sent? Submit your transaction hash for faster verification:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={txHash}
                            onChange={e => setTxHash(e.target.value)}
                            placeholder="0x... or txid..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                          />
                          <button
                            onClick={submitTxHash}
                            disabled={!txHash.trim() || actionLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                          >
                            Submit
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => { setCryptoOrder(null); if (pollRef.current) clearInterval(pollRef.current); }}
                        className="w-full mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors"
                      >
                        ← Choose different coin
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAQ / Info Section */}
      <div className="max-w-6xl mx-auto mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Secure Payments', desc: 'PayPal buyer protection and encrypted crypto transactions.' },
            { title: 'Instant Activation', desc: 'Premium is activated automatically within seconds of payment.' },
            { title: 'Auto-Renewal', desc: 'Renew anytime. Your premium status is always up to date.' },
          ].map((item, i) => (
            <div key={i} className="bg-[#12121a] border border-white/5 rounded-xl p-5 flex items-start gap-4">

              <div>
                <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
