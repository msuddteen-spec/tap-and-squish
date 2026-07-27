type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue>;
type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export class AnalyticsManager {
  private readonly measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  private readonly enabled = import.meta.env.PROD && Boolean(this.measurementId);
  private sessionEnded = false;

  constructor() {
    if (!this.enabled || !this.measurementId) return;

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = window.gtag ?? ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    script.dataset.squishyBreadAnalytics = 'ga4';
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', this.measurementId, { send_page_view: false });
    this.pageView();
    window.addEventListener('pagehide', this.handleSessionEnd);
  }

  pageView(): void {
    if (!this.enabled || !this.measurementId || !window.gtag) return;
    window.gtag('event', 'page_view', { page_location: window.location.href, page_title: document.title });
  }

  track(eventName: string, params: AnalyticsParams = {}): void {
    if (!this.enabled || !this.measurementId || !window.gtag) return;
    window.gtag('event', eventName, params);
  }

  dispose(): void {
    window.removeEventListener('pagehide', this.handleSessionEnd);
    this.handleSessionEnd();
  }

  private handleSessionEnd = (): void => {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.track('session_end');
  };
}