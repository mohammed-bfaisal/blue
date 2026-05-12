import { useState, useEffect, useCallback, useRef } from "react";
import type { User, Notification, FilterState, Level, Guide } from "../types";
import { BP } from "../lib/constants";
import {
  getLocalSession, clearLocalSession,
  dbLogin, dbRegister, dbGetProfile,
  dbGetGuides, dbGetUserUpvotes, dbToggleUpvote,
  dbGetNotifications, dbMarkNotificationRead, dbMarkAllNotificationsRead,
} from "../lib/db";

// ─── BREAKPOINT ───────────────────────────────────────────────
export function useBreakpoint() {
  const getSize = () => {
    const w = window.innerWidth;
    if (w < BP.xs) return "xs" as const;
    if (w < BP.sm) return "sm" as const;
    if (w < BP.md) return "md" as const;
    return "lg" as const;
  };
  const [bp, setBp] = useState(getSize);
  useEffect(() => {
    const h = () => setBp(getSize());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { bp, isMobile: bp === "xs" || bp === "sm", isTablet: bp === "md" };
}

// ─── AUTH ─────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session on mount
  useEffect(() => {
    (async () => {
      const session = getLocalSession();
      if (session?.userId) {
        try {
          const profile = await dbGetProfile(session.userId);
          if (profile) setUser(profile);
        } catch { clearLocalSession(); }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const profile = await dbLogin(email, password);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    setLoading(true);
    try {
      const profile = await dbRegister(email, username, password);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearLocalSession();
    setUser(null);
  }, []);

  return { user, loading, login, logout, register, isAuthenticated: !!user };
}

// ─── GUIDE FILTER STATE ───────────────────────────────────────
export function useGuideFilter() {
  const [filter, setFilter] = useState<FilterState>({
    niche: "All", level: null, search: "", status: "approved",
  });
  const setNiche = useCallback((niche: string) => setFilter(f => ({ ...f, niche })), []);
  const setLevel = useCallback((level: Level | null) =>
    setFilter(f => ({ ...f, level: f.level === level ? null : level as Level | null })), []);
  const setSearch = useCallback((search: string) => setFilter(f => ({ ...f, search })), []);
  return { filter, setNiche, setLevel, setSearch };
}

// ─── GUIDES (real DB) ─────────────────────────────────────────
export function useGuides(filter: FilterState) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await dbGetGuides({
          niche: filter.niche !== "All" ? filter.niche : undefined,
          level: filter.level ?? undefined,
          search: filter.search || undefined,
          status: "approved",
        });
        setGuides(rows);
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    }, filter.search ? 300 : 0);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [filter.niche, filter.level, filter.search]);

  return { guides, loading, error };
}

// ─── UPVOTE (optimistic + real DB) ────────────────────────────
export function useUpvote(guideId: string, initialCount: number, userId?: string) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    dbGetUserUpvotes(userId).then(ids => {
      if (ids.includes(guideId)) setVoted(true);
    }).catch(() => {});
  }, [guideId, userId]);

  const toggle = useCallback(async () => {
    if (loading || !userId) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setCount(c => wasVoted ? c - 1 : c + 1);
    setLoading(true);
    try {
      await dbToggleUpvote(guideId, userId, wasVoted);
    } catch {
      setVoted(wasVoted);
      setCount(c => wasVoted ? c + 1 : c - 1);
    }
    setLoading(false);
  }, [loading, voted, guideId, userId]);

  return { count, voted, loading, toggle };
}

// ─── NOTIFICATIONS (real DB) ──────────────────────────────────
export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEffect(() => {
    if (!userId) { setNotifications([]); return; }
    setLoadingNotifs(true);
    dbGetNotifications(userId)
      .then(rows => setNotifications(rows))
      .catch(() => {})
      .finally(() => setLoadingNotifs(false));
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await dbMarkNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (userId) await dbMarkAllNotificationsRead(userId).catch(() => {});
  }, [userId]);

  return { notifications, unreadCount, markRead, markAllRead, loadingNotifs };
}

// ─── FOCUS TRAP ───────────────────────────────────────────────
export function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [active]);
  return ref;
}

// ─── ASYNC HELPER ─────────────────────────────────────────────
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null, loading: true, error: null,
  });
  useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    fn()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch(e => { if (!cancelled) setState({ data: null, loading: false, error: e.message }); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
