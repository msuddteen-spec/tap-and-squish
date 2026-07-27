import fs from 'node:fs';

const file = 'src/ui/UIManager.ts';
let source = fs.readFileSync(file, 'utf8');
source = source.replace("import { LeaderboardManager } from '../game/LeaderboardManager';", "import { LeaderboardManager } from '../game/LeaderboardManager';\nimport { PWAInstallManager } from '../pwa/PWAInstallManager';");
source = source.replace('  private activeModal: HTMLElement | null = null;', '  private activeModal: HTMLElement | null = null;\n  private readonly pwa = new PWAInstallManager();');
source = source.replace('this.renderShell(); this.cacheRefs(); this.bindEvents(); this.renderState(game.state);', 'this.renderShell(); this.cacheRefs(); this.bindEvents(); this.renderState(game.state); this.renderInstallState(); this.cleanup.push(this.pwa.onChange(() => this.renderInstallState()));');
source = source.replace('<button class="danger-button" id="reset-button">Reset save data</button>', '<button class="install-button" id="install-button" hidden>ติดตั้งเกม</button><p class="ios-install-hint" id="ios-install-hint" hidden>แตะปุ่มแชร์ แล้วเลือก เพิ่มไปยังหน้าจอโฮม <button class="text-button" id="dismiss-install">ไม่ต้องแสดงอีก</button></p><button class="danger-button" id="reset-button">Reset save data</button>');
source = source.replace("'effects-toggle', 'toast'", "'effects-toggle', 'install-button', 'ios-install-hint', 'dismiss-install', 'toast'");
source = source.replace("this.on('#reset-button', 'click', () =>", "this.on('#install-button', 'click', () => { void this.pwa.install(); });\n    this.on('#dismiss-install', 'click', () => this.pwa.dismissIOSGuide());\n    this.on('#reset-button', 'click', () =>");
source = source.replace('  dispose(): void { this.cleanup.forEach((remove) => remove()); }', '  dispose(): void { this.cleanup.forEach((remove) => remove()); this.pwa.dispose(); }');
source = source.replace('  private navigate(target: string): void', "  private renderInstallState(): void { const installButton = this.refs['install-button']; const guide = this.refs['ios-install-hint']; if (installButton) installButton.hidden = !this.pwa.canInstall; if (guide) guide.hidden = !this.pwa.showIOSGuide; }\n  private navigate(target: string): void");
fs.writeFileSync(file, source);
