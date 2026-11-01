import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Incident, IncidentSummary, KpiStats, NormalizedEvent } from "./types";
import { fetchIncidents, fetchEvents, fetchStats } from "./api";

const EMPTY_STATS: KpiStats = {
  raw_events: 0,
  incidents: 0,
  critical_open: 0,
  opportunistic: 0,
  contained: 0,
  noise_suppressed_pct: 0
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected dashboard data error";
}

function useLiveState() {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [incidents, setIncidents] = useState<Record<string, Incident | IncidentSummary>>({});
  const [stats, setStats] = useState<KpiStats>(EMPTY_STATS);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, incRes, evRes] = await Promise.allSettled([
        fetchStats(),
        fetchIncidents(),
        fetchEvents(100)
      ]);
      const failures: string[] = [];
      if (stRes.status === 'fulfilled') {
        setStats(stRes.value);
      } else {
        failures.push(errorMessage(stRes.reason));
      }
      if (incRes.status === 'fulfilled') {
        setIncidents((previous) => Object.fromEntries(
          incRes.value.map((incident) => [
            incident.id,
            { ...previous[incident.id], ...incident }
          ])
        ));
      } else {
        failures.push(errorMessage(incRes.reason));
      }
      if (evRes.status === 'fulfilled') {
        setEvents(evRes.value);
      } else {
        failures.push(errorMessage(evRes.reason));
      }
      setError(failures.length > 0 ? failures.join(" · ") : null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();

    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let retryCount = 0;
    const connect = () => {
      if (stopped) return;
      const configured = process.env.NEXT_PUBLIC_WS_URL;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = configured && configured.length > 0
        ? configured
        : `${protocol}//${window.location.hostname}:8000/ws/live`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          retryCount = 0;
          setConnected(true);
          refreshAll();
        };

        ws.onclose = () => {
          if (stopped) return;
          setConnected(false);
          const delay = Math.min(30000, 1000 * 2 ** retryCount);
          retryCount += 1;
          retryTimeout = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onmessage = (msg) => {
          try {
            const parsed = JSON.parse(msg.data);
            const { kind, data } = parsed;

            if (kind === "event") {
              setEvents((prev) => [data as NormalizedEvent, ...prev].slice(0, 300));
              setStats((s) => ({
                ...s,
                raw_events: s.raw_events + 1
              }));
            } else if (kind === "incident") {
              const inc = data as Incident;
              setIncidents((prev) => ({
                ...prev,
                [inc.id]: { ...(prev[inc.id] || {}), ...inc }
              }));
              refreshAll();
            } else if (kind === "reset") {
              setEvents([]);
              setIncidents({});
              setStats(EMPTY_STATS);
              setError(null);
            }
          } catch (cause) {
            console.error("Could not parse a live MIRAGE event.", cause);
          }
        };

        wsRef.current = ws;
      } catch (cause) {
        console.error("Could not connect to the MIRAGE live stream.", cause);
        setConnected(false);
        retryTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
  }, [refreshAll]);

  return { events, incidents, stats, connected, loading, error, refreshAll };
}

type LiveState = ReturnType<typeof useLiveState>;
const LiveContext = createContext<LiveState | null>(null);

export function LiveProvider({ children }: { children: ReactNode }) {
  const state = useLiveState();
  return createElement(LiveContext.Provider, { value: state }, children);
}

export function useLive(): LiveState {
  const state = useContext(LiveContext);
  if (!state) throw new Error("useLive must be used inside LiveProvider");
  return state;
}
