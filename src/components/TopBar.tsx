import { ChevronLeft, ChevronRight, Menu, PanelRight, Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface TopBarProps {
  searchQuery: string;
  canGoBack: boolean;
  canGoForward: boolean;
  rightPanelOpen: boolean;
  onBack: () => void;
  onForward: () => void;
  onSearchChange: (q: string) => void;
  onOpenMobileNav: () => void;
  onToggleRightPanel: () => void;
}

export function TopBar({
  searchQuery,
  canGoBack,
  canGoForward,
  rightPanelOpen,
  onBack,
  onForward,
  onSearchChange,
  onOpenMobileNav,
  onToggleRightPanel,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && document.activeElement !== inputRef.current) {
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-circle-btn mobile-menu-btn"
          aria-label="Open navigation menu"
          onClick={onOpenMobileNav}
        >
          <Menu size={18} />
        </button>

        <button
          type="button"
          className="icon-circle-btn topbar-nav-arrows"
          aria-label="Go back"
          disabled={!canGoBack}
          onClick={onBack}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="icon-circle-btn topbar-nav-arrows"
          aria-label="Go forward"
          disabled={!canGoForward}
          onClick={onForward}
        >
          <ChevronRight size={18} />
        </button>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            value={searchQuery}
            placeholder={t('searchPlaceholder')}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('searchPlaceholder')}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <div className="lang-switch" role="group" aria-label="Language selection">
          <button
            type="button"
            className={`lang-opt ${lang === 'en' ? 'lang-opt--active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-opt ${lang === 'bn' ? 'lang-opt--active' : ''}`}
            onClick={() => setLang('bn')}
          >
            বাংলা
          </button>
        </div>

        <button
          type="button"
          className="soft-btn"
          onClick={onToggleRightPanel}
          aria-label={t('nowPlaying')}
          title={t('nowPlaying')}
        >
          <PanelRight size={16} color={rightPanelOpen ? '#ff9900' : undefined} />
          <span className="topbar-panel-label">{t('nowPlaying')}</span>
        </button>
      </div>
    </header>
  );
}
