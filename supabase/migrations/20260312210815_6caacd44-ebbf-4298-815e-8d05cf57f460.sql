ALTER TABLE public.ticket_panel_config 
  ADD COLUMN IF NOT EXISTS panel_content text DEFAULT '',
  ADD COLUMN IF NOT EXISTS dropdown_position text DEFAULT 'inside',
  ADD COLUMN IF NOT EXISTS ping_dm_message text DEFAULT 'Hey {user}! 👋\n\nYou have an open ticket in **The Nox** that needs your attention.\n\nPlease check your ticket and respond as soon as possible!\n\n-# The Nox — We Care About YOU ✦ Premium Digital Delivery';