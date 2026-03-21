import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mgfviqdxeupajntpylig.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZnZpcWR4ZXVwYWpudHB5bGlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjgwNDksImV4cCI6MjA4NzA0NDA0OX0.zxca3lBfqHt4EQ1pFLGlDkZUQJY1iQXaZA0cOflJc18';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
