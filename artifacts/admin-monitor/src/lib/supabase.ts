import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mgfviqdxeupajntpylig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnZpcWR4ZXVwYWpudHB5bGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjgwNDksImV4cCI6MjA4NzA0NDA0OX0.zxca3lBfqHt4EQ1pFLGlDkZUQJY1iQXaZA0cOflJc18';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});
