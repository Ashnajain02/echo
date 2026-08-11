-- Add disable_weather_effects preference to profiles table
-- Replaces the per-entry weather on/off toggle with a single account-wide setting.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS disable_weather_effects boolean NOT NULL DEFAULT false;
