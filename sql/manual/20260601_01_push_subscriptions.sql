-- Migration: Create Push Subscriptions Table and Notifications Trigger
-- Run this in your Supabase SQL Editor

-- Enable pg_net extension for HTTP requests if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Create the push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

-- 2. Configure RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- 3. Create a function to trigger the push notification Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the send-push-notification edge function asynchronously using pg_net (extension net)
  -- The URL is set to the project's edge function URL.
  PERFORM net.http_post(
    url := 'https://vymswxxmhllzgldausud.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJinc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bXN3eHhtaGxsemdsZGF1c3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDA1MzEsImV4cCI6MjA4NTU3NjUzMX0.T4fIB9cPTUjKfIvZw60cwhjIy4VK3izEIC_sG3bkVeg',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bXN3eHhtaGxsemdsZGF1c3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDA1MzEsImV4cCI6MjA4NTU3NjUzMX0.T4fIB9cPTUjKfIvZw60cwhjIy4VK3izEIC_sG3bkVeg'
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on public.notifications
DROP TRIGGER IF EXISTS trigger_on_new_notification ON public.notifications;
CREATE TRIGGER trigger_on_new_notification
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_notification();
