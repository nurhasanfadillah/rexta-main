
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string || 'https://wrggkbacornocdgamwkj.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyZ2drYmFjb3Jub2NkZ2Ftd2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzY3OTYsImV4cCI6MjA4Mjg1Mjc5Nn0.AEJSh26xIJDYpXpFuaGUaSkKMu0c0HmZ7isPY4UUbR4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
