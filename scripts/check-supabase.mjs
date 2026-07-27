import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((line) => line.includes('=')).map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const result = { auth: false, profilesTable: false, profileCount: null, countryView: false, syncFunction: false, rankFunctions: false, errors: [] };
const auth = await client.auth.signInAnonymously();
result.auth = Boolean(auth.data.user && auth.data.session);
if (auth.error) result.errors.push(`auth: ${auth.error.message}`);
const profileQuery = await client.from('profiles').select('id', { count: 'exact', head: false }).limit(1);
result.profilesTable = !profileQuery.error;
result.profileCount = profileQuery.count ?? null;
if (profileQuery.error) result.errors.push(`profiles: ${profileQuery.error.message}`);
const countryQuery = await client.from('country_leaderboard').select('country_code,total_score,player_count,rank').limit(5);
result.countryView = !countryQuery.error;
if (countryQuery.error) result.errors.push(`country_view: ${countryQuery.error.message}`);
if (auth.data.user) {
  const playerRank = await client.rpc('get_player_rank', { p_id: auth.data.user.id });
  const countryRank = await client.rpc('get_country_rank', { p_country_code: 'TH' });
  result.rankFunctions = !playerRank.error && !countryRank.error;
  if (playerRank.error) result.errors.push(`get_player_rank: ${playerRank.error.message}`);
  if (countryRank.error) result.errors.push(`get_country_rank: ${countryRank.error.message}`);
  const safeProbe = await client.rpc('sync_profile', { p_id: auth.data.user.id, p_username: 'x', p_country_code: 'TH', p_score: 0, p_high_score: 0, p_best_combo: 0, p_total_presses: 0 });
  result.syncFunction = Boolean(safeProbe.error && /char_length|check constraint|between/i.test(safeProbe.error.message));
  if (!result.syncFunction && safeProbe.error) result.errors.push(`sync_profile: ${safeProbe.error.message}`);
}
console.log(JSON.stringify(result, null, 2));
