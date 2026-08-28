'use client';

import { useEffect, useRef, useState } from 'react';

type ResourceRow = {
  name: string;
  type: string;
  durationMs: number;
  startMs: number;
  transferKB: number;
  cached: boolean;
};

type StallRow = {
  startMs: number;
  durationMs: number;
  source: 'longtask' | 'rAF-gap';
};

type PerfStats = {
  ttfb: number;
  domContentLoaded: number;
  loadEvent: number | 'pending';
  hydrationDone: number;
  resourceCount: number;
  totalKB: number;
  slowest: ResourceRow[];
  stalls: StallRow[];
  longTaskApiSupported: boolean;
};

// Purely diagnostic. Renders NOTHING unless the URL contains "perfdebug" —
// zero effect on any real visitor, design, or functionality otherwise.
//
// Previous runs showed: all individual network resources finish fast
// (<300ms each, most already cached), yet window.onload/hydration still
// don't land until 9-15s AFTER every resource is done loading. That gap is
// invisible to Resource Timing — it means something is occupying the main
// JS thread (parsing/executing/rendering) for that whole stretch. This
// version adds two independent ways to catch that: the Long Tasks API
// (any script/rendering work that blocks the main thread ≥50ms) and, as a
// fallback in case WebKit doesn't report long tasks reliably, a
// requestAnimationFrame "heartbeat" that flags any gap between frames
// bigger than 50ms (a frame can only be late if something else was
// hogging the thread). Remove this whole component once the iOS
// performance issue is confirmed fixed.
export function PerfDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<PerfStats | null>(null);
  const [copied, setCopied] = useState(false);
  const hydrationMarkRef = useRef<number | null>(null);
  const stallsRef = useRef<StallRow[]>([]);
  const longTaskApiRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.search.includes('perfdebug')) return;
    setEnabled(true);

    hydrationMarkRef.current = performance.now();

    // --- Long Tasks API (primary source) ---
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          stallsRef.current.push({
            startMs: Math.round(entry.startTime),
            durationMs: Math.round(entry.duration),
            source: 'longtask',
          });
        }
      });
      po.observe({ type: 'longtask', buffered: true } as PerformanceObserverInit);
      longTaskApiRef.current = true;
    } catch {
      longTaskApiRef.current = false;
    }

    // --- requestAnimationFrame gap watchdog (fallback / cross-check) ---
    let rafId: number;
    let lastFrame = performance.now();
    let rafActive = true;
    const rafLoop = (now: number) => {
      const gap = now - lastFrame;
      if (gap > 50) {
        stallsRef.current.push({
          startMs: Math.round(lastFrame),
          durationMs: Math.round(gap),
          source: 'rAF-gap',
        });
      }
      lastFrame = now;
      if (rafActive) rafId = requestAnimationFrame(rafLoop);
    };
    rafId = requestAnimationFrame(rafLoop);

    const buildStats = (loadEventMs: number | 'pending'): PerfStats => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const resources = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];

      const rows: ResourceRow[] = resources.map((r) => ({
        name: r.name.replace(window.location.origin, ''),
        type: r.initiatorType || '?',
        durationMs: Math.round(r.responseEnd - r.startTime),
        startMs: Math.round(r.startTime),
        transferKB: Math.round((r.transferSize || 0) / 1024),
        cached: r.transferSize === 0 && r.decodedBodySize > 0,
      }));
      rows.sort((a, b) => b.durationMs - a.durationMs);

      const stalls = [...stallsRef.current]
        .sort((a, b) => a.startMs - b.startMs)
        .slice(0, 20);

      return {
        ttfb: nav ? Math.round(nav.responseStart) : -1,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : -1,
        loadEvent: loadEventMs,
        hydrationDone: Math.round(hydrationMarkRef.current ?? 0),
        resourceCount: resources.length,
        totalKB: Math.round(
          resources.reduce((acc, r) => acc + (r.transferSize || 0), 0) / 1024
        ),
        slowest: rows.slice(0, 8),
        stalls,
        longTaskApiSupported: longTaskApiRef.current,
      };
    };

    setStats(
      buildStats(document.readyState === 'complete' ? Math.round(performance.now()) : 'pending')
    );

    const onLoad = () => setStats(buildStats(Math.round(performance.now())));
    window.addEventListener('load', onLoad);

    const interval = setInterval(() => {
      setStats((prev) =>
        buildStats(prev && prev.loadEvent !== 'pending' ? prev.loadEvent : 'pending')
      );
    }, 2000);
    const stopAfter = setTimeout(() => {
      clearInterval(interval);
      rafActive = false;
      cancelAnimationFrame(rafId);
      po?.disconnect();
    }, 45000);

    return () => {
      window.removeEventListener('load', onLoad);
      clearInterval(interval);
      clearTimeout(stopAfter);
      rafActive = false;
      cancelAnimationFrame(rafId);
      po?.disconnect();
    };
  }, []);

  if (!enabled) return null;

  const reportText = stats
    ? [
        `TTFB: ${stats.ttfb}ms`,
        `DOMContentLoaded: ${stats.domContentLoaded}ms`,
        `window.onload: ${stats.loadEvent}ms`,
        `React hydrated: ~${stats.hydrationDone}ms`,
        `Resurslar: ${stats.resourceCount} ta / ${stats.totalKB}KB`,
        `Long Tasks API: ${stats.longTaskApiSupported ? 'bor' : "yo'q (faqat rAF-gap ishlatilyapti)"}`,
        ``,
        `ENG SEKIN 8 RESURS (tarmoq):`,
        ...stats.slowest.map(
          (r, i) =>
            `${i + 1}. [${r.durationMs}ms, start ${r.startMs}ms${
              r.cached ? ', cache' : ` ${r.transferKB}KB`
            }] ${r.type} ${r.name}`
        ),
        ``,
        `MAIN THREAD TO'XTASHLARI (${stats.stalls.length} ta, xronologik):`,
        ...(stats.stalls.length
          ? stats.stalls.map(
              (s, i) => `${i + 1}. [${s.source}] start ${s.startMs}ms, davomiyligi ${s.durationMs}ms`
            )
          : ['(hozircha topilmadi)']),
      ].join('\n')
    : "perfdebug: yig'ilyapti...";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can refuse without a fresh gesture on some WebKit
      // versions — the visible text is still there as a fallback.
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        right: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        color: '#4ade80',
        fontFamily: 'monospace',
        fontSize: 10,
        lineHeight: 1.5,
        padding: '10px 12px',
        borderRadius: 8,
        maxHeight: '60vh',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      <button
        onClick={handleCopy}
        style={{
          position: 'sticky',
          top: 0,
          float: 'right',
          background: copied ? '#16a34a' : '#166534',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'inherit',
          marginBottom: 6,
        }}
      >
        {copied ? '✓ Nusxalandi' : 'Nusxalash'}
      </button>
      {reportText}
    </div>
  );
}
