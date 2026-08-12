-- Migration: Remove Manual Push Notification Trigger and Function
-- Run this in your Supabase SQL Editor to clean up before setting up the Database Webhook.

-- 1. Drop the old trigger from the public.notifications table
DROP TRIGGER IF EXISTS trigger_on_new_notification ON public.notifications;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS public.handle_new_notification();
