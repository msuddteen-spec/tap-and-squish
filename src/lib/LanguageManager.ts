export type LanguageCode = 'th' | 'en' | 'ja';
const LANGUAGE_KEY = 'squishyBread.language.v1';

const translations = {
  th: { language: 'ภาษา', score: 'คะแนน', combo: 'คอมโบ', coins: 'เหรียญ', play: 'เล่น', mission: 'ภารกิจ', leaderboard: 'อันดับ', settings: 'ตั้งค่า', ready: 'พร้อมให้บีบแล้ว', touch: 'แตะที่ขนมปัง', soft: 'แล้วรู้สึกถึงความนุ่ม', sound: 'เสียง', haptic: 'สั่นตอบสนอง', reduce: 'ลดเอฟเฟกต์', install: 'ติดตั้งเกม', changeCountry: 'เปลี่ยนประเทศ', share: 'แชร์คะแนน', reset: 'รีเซ็ตข้อมูล', claim: 'รับรางวัล +100', close: 'ปิด', rank: ['Bread Rookie', 'Bread Lover', 'Bread Fan', 'Bread Master', 'Bread Legend', 'Bread Emperor', 'Bread God'] },
  en: { language: 'Language', score: 'Score', combo: 'Combo', coins: 'Coins', play: 'Play', mission: 'Mission', leaderboard: 'Leaderboard', settings: 'Settings', ready: 'Ready to squish', touch: 'Tap the bread', soft: 'and feel the softness', sound: 'Sound', haptic: 'Haptic', reduce: 'Reduce effects', install: 'Install game', changeCountry: 'Change country', share: 'Share score', reset: 'Reset save data', claim: 'Claim +100', close: 'Close', rank: ['Bread Rookie', 'Bread Lover', 'Bread Fan', 'Bread Master', 'Bread Legend', 'Bread Emperor', 'Bread God'] },
  ja: { language: '言語', score: 'スコア', combo: 'コンボ', coins: 'コイン', play: 'プレイ', mission: 'ミッション', leaderboard: 'ランキング', settings: '設定', ready: 'つぶす準備完了', touch: 'パンをタップして', soft: 'やわらかさを感じよう', sound: 'サウンド', haptic: '振動', reduce: 'エフェクトを減らす', install: 'ゲームをインストール', changeCountry: '国を変更', share: 'スコアを共有', reset: 'セーブデータをリセット', claim: '+100を受け取る', close: '閉じる', rank: ['Bread Rookie', 'Bread Lover', 'Bread Fan', 'Bread Master', 'Bread Legend', 'Bread Emperor', 'Bread God'] },
} as const;

export class LanguageManager {
  private current: LanguageCode = this.read();
  get code(): LanguageCode { return this.current; }
  get t() { return translations[this.current]; }
  set(code: LanguageCode): void { this.current = code; localStorage.setItem(LANGUAGE_KEY, code); }
  rankTitle(score: number): string { const index = score >= 100000 ? 6 : score >= 20000 ? 5 : score >= 5000 ? 4 : score >= 1500 ? 3 : score >= 500 ? 2 : score >= 100 ? 1 : 0; return this.t.rank[index]; }
  private read(): LanguageCode { const value = localStorage.getItem(LANGUAGE_KEY); return value === 'en' || value === 'ja' || value === 'th' ? value : 'th'; }
}