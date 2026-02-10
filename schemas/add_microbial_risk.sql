-- Migration: Add microbial_risk columns to water_potability and field_samples
-- Run this in the Supabase SQL Editor BEFORE running the backfill script.

-- 1. Add microbial_risk column to water_potability
ALTER TABLE public.water_potability
  ADD COLUMN IF NOT EXISTS microbial_risk text;

-- Optional: add a CHECK constraint
ALTER TABLE public.water_potability
  DROP CONSTRAINT IF EXISTS water_potability_microbial_risk_check;

ALTER TABLE public.water_potability
  ADD CONSTRAINT water_potability_microbial_risk_check
  CHECK (microbial_risk IS NULL OR microbial_risk IN ('low', 'medium', 'high'));


-- 2. Add microbial risk columns to field_samples
ALTER TABLE public.field_samples
  ADD COLUMN IF NOT EXISTS microbial_risk text,
  ADD COLUMN IF NOT EXISTS microbial_score integer,
  ADD COLUMN IF NOT EXISTS possible_bacteria jsonb DEFAULT '[]'::jsonb;
