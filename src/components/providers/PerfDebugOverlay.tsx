'use client';

import { useEffect, useState } from 'react';

type PerfStats = {
  ttfb: number;
  domContentLoaded: number;
  loadEvent: number;
  hydrationDone: number;
  jsCount: number;
  jsBytes: number;
  imgCount: number;
  imgBytes: number;
  totalCount: number;
  totalBytes: number;
};

// Purely diagnostic. Renders NOTHING unless the URL contains "perfdebug" —
// so by default this has zero effect on any real visitor, design, or
// functionality. Its only purpose is to let us read real on-device timing
// numbers straight off a failing phone's screen (photo/screenshot), since
// we have no Mac to attach Safari Web Inspector to and the server's nginx
// access log only shows *when* a request arrived, not how long the phone's
// own JS parsing/hydration took after that. Remove once the iOS
// performance issue is confirmed fixed.
export function PerfDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<PerfStats | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.search.includes('perfdebug')) return;
    setEnabled(true);

    // This effect only runs once React has hydrated this component, so
    // performance.now() here is a reasonable proxy for "hydration reached
    // this point in the tree" — logged as an approximate hydration-done
    // marker rather than a precise whole-page number.
    const hydrationDone = performance.now();

    const collect = () => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const resources = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];
      const js = resources.filter(
        (r) => r.initiatorType === 'script' || r.name.endsWith('.js')
      );
      const img = resources.filter(
        (r) =>
          r.initiatorType === 'img' || /\.(jpe?g|png|webp|gif|svg)(\?|$)/.test(r.name)
      );
      const sumKB = (arr: PerformanceResourceTiming[]) =>
        Math.round(arr.reduce((acc, r) => acc + (r.transferSize || 0), 0) / 1024);

      setStats({
        ttfb: nav ? Math.round(nav.responseStart) : -1,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : -1,
        loadEvent: nav ? Math.round(nav.loadEventEnd) : -1,
        hydrationDone: Math.round(hydrationDone),
        jsCount: js.length,
        jsBytes: sumKB(js),
        imgCount: img.length,
        imgBytes: sumKB(img),
        totalCount: resources.length,
        totalBytes: sumKB(resources),
      });
    };

    // Sample twice: shortly after mount, and again a few seconds later,
    // since late/lazy resources (fonts, below-fold images) can still be
    // in flight right at the moment hydration finishes.
    const t1 = setTimeout(collect, 500);
    const t2 = setTimeout(collect, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        left: 8,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.85)',
        color: '#4ade80',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.6,
        padding: '10px 12px',
        borderRadius: 8,
        maxWidth: '92vw',
        whiteSpace: 'pre',
        pointerEvents: 'none',
      }}
    >
      {stats
        ? `TTFB: ${stats.ttfb}ms
DOMContentLoaded: ${stats.domContentLoaded}ms
window.onload: ${stats.loadEvent}ms
React hydrated: ~${stats.hydrationDone}ms
JS: ${stats.jsCount} files / ${stats.jsBytes}KB
IMG: ${stats.imgCount} files / ${stats.imgBytes}KB
Total: ${stats.totalCount} files / ${stats.totalBytes}KB`
        : 'perfdebug: yig\'ilyapti...'}
    </div>
  );
}
