import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Flag images via flagcdn.com — free, reliable CDN for country flag PNGs
const FLAG_URL = (countryCode) => `https://flagcdn.com/w40/${countryCode}.png`;

const LANGUAGES = [
  { code: 'en', name: 'English',   country: 'gb', dir: 'ltr' },
  { code: 'fr', name: 'Français',  country: 'fr', dir: 'ltr' },
  { code: 'es', name: 'Español',   country: 'es', dir: 'ltr' },
  { code: 'de', name: 'Deutsch',   country: 'de', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe',    country: 'tr', dir: 'ltr' },
  { code: 'ar', name: 'العربية',   country: 'sa', dir: 'rtl' },
  { code: 'pt', name: 'Português', country: 'br', dir: 'ltr' },
  { code: 'zh', name: '繁體中文',  country: 'tw', dir: 'ltr' },
  { code: 'ru', name: 'Русский',   country: 'ru', dir: 'ltr' },
  { code: 'ko', name: '한국어',    country: 'kr', dir: 'ltr' },
];

/** Circular flag image with graceful fallback */
function Flag({ country, size = 22 }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          minWidth: size,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          fontSize: size * 0.4,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          userSelect: 'none',
        }}
      >
        {country.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={FLAG_URL(country)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        userSelect: 'none',
      }}
    />
  );
}

export default function ThemeLanguageSwitcher() {
  const { i18n } = useTranslation();
  const [theme, setTheme]               = useState(localStorage.getItem('nexus-theme')    || 'dark');
  const [language, setLanguage]         = useState(localStorage.getItem('nexus-language') || 'en');
  const [menuOpen, setMenuOpen]         = useState(false);
  const [animating, setAnimating]       = useState(false);

  const dropdownRef = useRef(null);
  const triggerRef  = useRef(null);

  /* ── Apply theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus-theme', theme);
  }, [theme]);

  /* ── Apply language / RTL ── */
  useEffect(() => {
    i18n.changeLanguage(language);
    const lang = LANGUAGES.find(l => l.code === language);
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', lang?.dir || 'ltr');
    localStorage.setItem('nexus-language', language);
  }, [language, i18n]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        triggerRef.current  && !triggerRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  /* ── Close on Escape ── */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');

  const selectLanguage = (code) => {
    if (code === language) { setMenuOpen(false); return; }
    setLanguage(code);
    setMenuOpen(false);
    setTimeout(() => window.location.reload(), 80);
  };

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <>
      {/* ── Keyframe injection ── */}
      <style>{`
        @keyframes _langIn {
          from { opacity:0; transform:translateY(8px) scale(0.96); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
        ._lang-menu { animation: _langIn 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        ._lang-item:hover { background: rgba(255,255,255,0.06); }
        ._lang-item-active { background: linear-gradient(90deg, rgba(239,68,68,0.14), rgba(168,85,247,0.08)); }
      `}</style>

      <div style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%' }}>

        {/* ════════════════════════════════
            Theme Toggle Button
        ════════════════════════════════ */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.transform='scale(1.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.transform='scale(1)'; }}
        >
          {theme === 'dark' ? (
            /* Sun icon */
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20" style={{color:'#facc15'}}>
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            /* Moon icon */
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20" style={{color:'#cbd5e1'}}>
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {/* ════════════════════════════════
            Language Selector
        ════════════════════════════════ */}
        <div style={{ position:'relative', flex:1, minWidth:0 }}>

          {/* Trigger */}
          <button
            ref={triggerRef}
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.10)'; }}
          >
            {/* Flag */}
            <Flag country={currentLang.country} size={22} />

            {/* Code label */}
            <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.90)', letterSpacing:'0.05em', flex:1, textAlign:'left' }}>
              {currentLang.code.toUpperCase()}
            </span>

            {/* Chevron */}
            <svg
              width="12" height="12"
              fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5"
              viewBox="0 0 24 24"
              style={{
                flexShrink: 0,
                transition: 'transform 0.25s',
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── Dropdown Menu ── */}
          {menuOpen && (
            <div
              ref={dropdownRef}
              className="_lang-menu"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 'calc(100% + 8px)',
                zIndex: 9999,
                borderRadius: 16,
                overflow: 'hidden',
                background: 'rgba(15,23,42,0.97)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '10px 16px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
              }}>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'0.14em' }}>
                  Language
                </span>
              </div>

              {/* List */}
              <div style={{ maxHeight: 340, overflowY:'auto' }}>
                {LANGUAGES.map((lang) => {
                  const active = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => selectLanguage(lang.code)}
                      className={active ? '_lang-item _lang-item-active' : '_lang-item'}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderLeft: active ? '2px solid #ef4444' : '2px solid transparent',
                        transition: 'background 0.15s, border-color 0.15s',
                        textAlign: 'left',
                      }}
                    >
                      {/* Flag */}
                      <Flag country={lang.country} size={26} />

                      {/* Language name */}
                      <span style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        color: active ? '#ffffff' : 'rgba(255,255,255,0.72)',
                        transition: 'color 0.15s',
                      }}>
                        {lang.name}
                      </span>

                      {/* Active checkmark */}
                      {active && (
                        <svg width="15" height="15" fill="#f87171" viewBox="0 0 20 20" style={{flexShrink:0}}>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
