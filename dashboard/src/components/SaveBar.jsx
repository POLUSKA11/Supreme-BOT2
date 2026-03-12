import { useEffect, useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

/**
 * Discord-style floating save bar
 * Shows when there are unsaved changes and provides save/discard options
 */
export default function SaveBar({ 
  isDirty, 
  isSaving, 
  onSave, 
  onDiscard,
  message = null,
  messageType = null
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState(null);

  useEffect(() => {
    setIsVisible(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      const timer = setTimeout(() => {
        setDisplayMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (displayMessage && messageType) {
    return (
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300 ${
        messageType === 'success' 
          ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' 
          : messageType === 'error'
          ? 'bg-red-600/20 border border-red-500/30 text-red-400'
          : 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
      } rounded-2xl px-6 py-3 flex items-center gap-3 backdrop-blur-xl shadow-2xl`}>
        {messageType === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
        {messageType === 'error' && <X className="w-5 h-5 flex-shrink-0" />}
        {messageType === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
        <span className="font-medium text-sm">{displayMessage}</span>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
    }`}>
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent backdrop-blur-xl pointer-events-none"></div>

      {/* Save Bar Container */}
      <div className="relative px-6 py-4 md:py-6 flex items-center justify-center md:justify-between gap-4 md:gap-8">
        <div className="hidden md:flex items-center gap-3 text-slate-300">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
          <span className="text-sm font-medium">You have unsaved changes</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="flex-1 md:flex-initial px-6 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-slate-100 rounded-xl text-sm font-bold transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Discard
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 md:flex-initial px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
