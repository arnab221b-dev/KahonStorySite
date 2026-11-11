import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import {
  COPY,
  formatTemplate,
  localizeDigits,
  localizeGenre,
  localizeRelativeTime,
  localizeViews,
  type Language,
  type TranslationKey,
} from './translations';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  tf: (key: TranslationKey, vars: Record<string, string | number>) => string;
  digits: (val: string | number) => string;
  genreLabel: (genre: string) => string;
  timeAgoLabel: (publishedText: string) => string;
  viewsLabel: (viewsText: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = usePersistentState<Language>('kahon_lang', 'en');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = COPY[lang].docTitle;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'bn' : 'en'));
  }, [setLang]);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = COPY[lang];
    return {
      lang,
      setLang,
      toggleLang,
      t: (key) => dict[key],
      tf: (key, vars) => formatTemplate(dict[key], vars),
      digits: (val) => localizeDigits(val, lang),
      genreLabel: (genre) => localizeGenre(genre, lang),
      timeAgoLabel: (publishedText) => localizeRelativeTime(publishedText, lang),
      viewsLabel: (viewsText) => localizeViews(viewsText, lang),
    };
  }, [lang, setLang, toggleLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
