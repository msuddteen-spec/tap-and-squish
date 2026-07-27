import type { SaveState } from '../types/game';

export class ShareManager {
  async shareScore(state: SaveState): Promise<'shared' | 'cancelled' | 'opened'> {
    const text = `ฉันทำได้ ${new Intl.NumberFormat().format(state.score)} คะแนนใน Squishy Bread 🍞 คอมโบสูงสุด x${state.bestCombo}`;
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Squishy Bread', text, url });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      }
    }
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer,width=640,height=640');
    return 'opened';
  }
}