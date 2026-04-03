import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jfjjymprvjfltpvmfptj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-eZdi59tpuW9lHFoqdibqA_jnCeG3vB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
