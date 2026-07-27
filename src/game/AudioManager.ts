const SOUND_PATHS = ['/sounds/squish-01.mp3', '/sounds/squish-02.mp3', '/sounds/squish-03.mp3', '/sounds/squish-04.mp3'];
const MUTE_KEY = 'squishyBread.audioMuted.v1';

export class AudioManager {
  private readonly sounds: HTMLAudioElement[] = [];
  private readonly maxPlaying = 3;
  private muted = localStorage.getItem(MUTE_KEY) === 'true';
  private unlocked = false;

  constructor() {
    for (const path of SOUND_PATHS) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.addEventListener('error', () => undefined);
      this.sounds.push(audio);
    }
  }
  get isMuted(): boolean { return this.muted; }
  setMuted(value: boolean): void { this.muted = value; localStorage.setItem(MUTE_KEY, String(value)); }
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const audio of this.sounds) { audio.muted = true; void audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.muted = this.muted; }).catch(() => undefined); }
  }
  playSquish(): void {
    this.unlock();
    if (this.muted || this.sounds.filter((sound) => !sound.paused).length >= this.maxPlaying) return;
    const available = this.sounds.filter((sound) => sound.paused);
    const audio = available[Math.floor(Math.random() * available.length)] ?? this.sounds[0];
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.42;
    audio.playbackRate = 0.94 + Math.random() * 0.14;
    void audio.play().catch(() => undefined);
  }
}
