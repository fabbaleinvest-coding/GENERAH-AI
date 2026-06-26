'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Lang = 'it' | 'en';

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<Ctx>({
  lang: 'it',
  setLang: () => {},
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('it');

  useEffect(() => {
    // Italiano è sempre la lingua predefinita. Si passa all'inglese solo se
    // l'utente lo ha scelto esplicitamente in una sessione precedente.
    try {
      const saved = window.localStorage.getItem('generah-lang') as Lang | null;
      if (saved === 'en') setLangState('en');
      else setLangState('it');
    } catch {
      /* no-op */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem('generah-lang', l);
      document.documentElement.lang = l;
    } catch {
      /* no-op */
    }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === 'it' ? 'en' : 'it');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

// Helper: pick a localized value from a { it, en } pair
export function pick<T>(lang: Lang, pair: { it: T; en: T }): T {
  return pair[lang];
}
