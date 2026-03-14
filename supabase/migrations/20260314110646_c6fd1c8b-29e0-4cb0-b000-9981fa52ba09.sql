-- Add rig_enabled and rigged_users columns
ALTER TABLE public.giveaways ADD COLUMN rig_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.giveaways ADD COLUMN rigged_users jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing data
UPDATE public.giveaways 
SET rig_enabled = true, 
    rigged_users = jsonb_build_array(jsonb_build_object('user_id', rigged_user_id, 'username', COALESCE(rigged_username, '')))
WHERE rigged_user_id IS NOT NULL AND rigged_user_id != '';

-- Drop old columns
ALTER TABLE public.giveaways DROP COLUMN rigged_user_id;
ALTER TABLE public.giveaways DROP COLUMN rigged_username;