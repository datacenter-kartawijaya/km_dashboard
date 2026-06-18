import { createClient } from '@supabase/supabase-js';
import { KMUser, Project } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Clean schema instructions that the user can run in the Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- COPY AND RUN THIS IN YOUR SUPABASE SQL EDITOR TO SETUP TABLES:
--
-- 1. Create table for Projects
CREATE TABLE IF NOT EXISTS public.km_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    "targetTotal" INTEGER NOT NULL DEFAULT 0,
    "salaryConfig" JSONB NOT NULL DEFAULT '{"priceBT": 1500, "priceSU": 1000}'::jsonb,
    "sheetIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "targetPerDayOperator" INTEGER,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for projects
ALTER TABLE public.km_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.km_projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.km_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.km_projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.km_projects FOR DELETE USING (true);

-- 2. Create table for Users
CREATE TABLE IF NOT EXISTS public.km_users (
    username TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'leader',
    password TEXT NOT NULL,
    "projectId" TEXT REFERENCES public.km_projects(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE public.km_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.km_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.km_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.km_users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.km_users FOR DELETE USING (true);

-- 3. Create table for Custom Operator Targets
CREATE TABLE IF NOT EXISTS public.km_operator_targets (
    id TEXT PRIMARY KEY,
    "targetPerDay" INTEGER NOT NULL DEFAULT 150,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for operator targets
ALTER TABLE public.km_operator_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.km_operator_targets FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.km_operator_targets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.km_operator_targets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.km_operator_targets FOR DELETE USING (true);

-- 4. Supabase API Grant Permissions (Required for projects post-May 30, 2026)
-- Grant necessary privileges to the API consumer roles (anon, authenticated, service_role)
GRANT ALL ON TABLE public.km_projects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.km_users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.km_operator_targets TO anon, authenticated, service_role;
`;

console.log(
  isSupabaseConfigured 
    ? "🔌 Supabase database helper connected successfully." 
    : "⚠️ Supabase keys are missing in env. Local fallback/Offline storage mode is active."
);
