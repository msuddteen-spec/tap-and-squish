import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = typeof import.meta.env.VITE_SUPABASE_URL === 'string' ? import.meta.env.VITE_SUPABASE_URL.trim() : '';
const rawKey = typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
  ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
  : typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : '';

const isValidSupabaseUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

const isValidSupabaseKey = (value: string): boolean => {
  if (value.startsWith('sb_publishable_')) return value.length > 'sb_publishable_'.length;
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
};

const getConfigError = (): string | null => {
  if (!rawUrl || !rawKey) return 'Supabase ยังไม่ได้ตั้งค่า URL หรือ publishable key';
  if (!isValidSupabaseUrl(rawUrl)) return 'Supabase URL ไม่ถูกต้อง ต้องเป็น HTTPS และลงท้ายด้วย .supabase.co';
  if (!isValidSupabaseKey(rawKey)) return 'Supabase key ไม่ถูกต้อง ต้องเป็น sb_publishable_ หรือ legacy anon key';
  return null;
};

export const supabaseConfigError = getConfigError();
export const isSupabaseConfigured = supabaseConfigError === null;
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

export const friendlySupabaseError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|network|fetch/i.test(message)) {
    return 'ไม่สามารถเชื่อมต่อ Supabase ได้ โปรดตรวจสอบอินเทอร์เน็ตหรือการตั้งค่าโปรเจกต์';
  }
  return message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase';
};

if (!isSupabaseConfigured) {
  console.warn(`[Squishy Bread] ${supabaseConfigError}. ใช้ mock/offline mode`);
}