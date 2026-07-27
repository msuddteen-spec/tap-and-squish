const DISMISS_KEY = 'squishyBread.pwaInstallDismissed.v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export class PWAInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly callbacks = new Set<() => void>();
  private readonly standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  private readonly ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  private dismissed = localStorage.getItem(DISMISS_KEY) === 'true';

  constructor() {
    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', this.onAppInstalled);
  }
  get canInstall(): boolean { return Boolean(this.deferredPrompt) && !this.standalone; }
  get showIOSGuide(): boolean { return this.ios && !this.standalone && !this.dismissed; }
  onChange(callback: () => void): () => void { this.callbacks.add(callback); return () => this.callbacks.delete(callback); }
  async install(): Promise<void> { if (!this.deferredPrompt) return; const prompt = this.deferredPrompt; this.deferredPrompt = null; await prompt.prompt().catch(() => undefined); await prompt.userChoice.catch(() => undefined); this.notify(); }
  dismissIOSGuide(): void { this.dismissed = true; localStorage.setItem(DISMISS_KEY, 'true'); this.notify(); }
  dispose(): void { window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt as EventListener); window.removeEventListener('appinstalled', this.onAppInstalled); }
  private onBeforeInstallPrompt = (event: Event): void => { event.preventDefault(); this.deferredPrompt = event as BeforeInstallPromptEvent; this.notify(); };
  private onAppInstalled = (): void => { this.deferredPrompt = null; this.notify(); };
  private notify(): void { this.callbacks.forEach((callback) => callback()); }
}
