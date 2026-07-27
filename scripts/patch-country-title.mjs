import fs from 'node:fs';
const file = 'src/ui/UIManager.ts'; let source = fs.readFileSync(file, 'utf8'); source = source.replace("'leaderboard-status','profile-modal'", "'leaderboard-status','profile-modal','profile-title'"); fs.writeFileSync(file, source);
