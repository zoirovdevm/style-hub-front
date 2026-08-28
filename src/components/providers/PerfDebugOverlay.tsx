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

type PerfStats = {
  ttfb: number;
  domContentLoaded: number;
  loadEvent: number | 'pending';
  hydrationDone: number;
  resourceCount: number;
  totalKB: number;
  slowest: ResourceRow[];
};

// Purely diagnostic. Renders NOTHING unless the URL contains "perfdebug" —
// so by default this has zero effect on any real visitor, design, or
// functionality. Its only purpose is to let us read real on-device timing
// numbers straight off a failing phone's screen, since we have no Mac to
// attach Safari Web Inspector to and the server's nginx access log only
// shows *when* a request arrived, not how long the phone's own resource
// loading / JS execution took after that. Remove once the iOS performance
// issue is confirmed fixed.
export function PerfDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<PerfStats | null>(null);
  const [copied, setCopied] = useState(false);
  const hydrationMarkRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.search.includes('perfdebug')) return;
    setEnabled(true);

    // This effect only runs once React has hydrated this component, so
    // performance.now() here is a reasonable proxy for "hydration reached
    // this point in the tree" — an approximate hydration-done marker
    // rather than a precise whole-page number.
    hydrationMarkRef.current = performance.now();

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

      return {
        ttfb: nav ? Math.round(nav.responseStart) : -1,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : -1,
        loadEvent: loadEventMs,
        hydrationDone: Math.round(hydrationMarkRef.current ?? 0),
        resourceCount: resources.length,
        totalKB: Math.round(
          resources.reduce((acc, r) => acc + (r.transferSize || 0), 0) / 1024
        ),
        slowest: rows.slice(0, 10),
      };
    };

    // Snapshot immediately (covers the case where 'load' already fired
    // before this component mounted) and refresh periodically so the
    // on-screen panel keeps catching up while things are still loading.
    setStats(buildStats(document.readyState === 'complete' ? Math.round(performance.now()) : 'pending'));

    const onLoad = () => setStats(buildStats(Math.round(performance.now())));
    window.addEventListener('load', onLoad);

    // Keep refreshing the resource list every 2s for a while after load
    // too — some images/fonts can still trickle in.
    const interval = setInterval(() => {
      setStats((prev) =>
        buildStats(
          document.readyState === 'complete'
            ? prev && prev.loadEvent !== 'pending'
              ? prev.loadEvent
              : Math.round(performance.now())
            : 'pending'
        )
      );
    }, 2000);
    const stopAfter = setTimeout(() => clearInterval(interval), 40000);

    return () => {
      window.removeEventListener('load', onLoad);
      clearInterval(interval);
      clearTimeout(stopAfter);
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
        ``,
        `ENG SEKIN 10 RESURS:`,
        ...stats.slowest.map(
          (r, i) =>
            `${i + 1}. [${r.durationMs}ms, start ${r.startMs}ms${
              r.cached ? ', cache' : ` ${r.transferKB}KB`
            }] ${r.type} ${r.name}`
        ),
      ].join('\n')
    : 'perfdebug: yig\'ilyapti...';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can refuse without a fresh user gesture on some
      // WebKit versions — the visible text is still there as a fallback.
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
        maxHeight: '55vh',
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
