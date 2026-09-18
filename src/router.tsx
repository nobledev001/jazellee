import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface RouterState {
  path: string;
  search: URLSearchParams;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterState | undefined>(undefined);

function parseUrl(url: string) {
  const parsed = new URL(url, window.location.origin);
  return { path: parsed.pathname, search: new URLSearchParams(parsed.search) };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => parseUrl(window.location.href));

  useEffect(() => {
    const onPopState = () => setState(parseUrl(window.location.href));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setState(parseUrl(to));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || target.target === '_blank') return;
      event.preventDefault();
      navigate(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  return <RouterContext.Provider value={{ ...state, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}
