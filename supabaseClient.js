import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://byxqznicohlojeqrxcli.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9g17kGKKB4svHGfpZNUbXA_5PczqoES'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
)
