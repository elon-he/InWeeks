
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhmjrdlczcoynxrjolav.supabase.co';
const supabaseKey = 'sb_publishable_TKgcSnm4BaKhaXAUOovMuA_hb-3yGa0';

export const supabase = createClient(supabaseUrl, supabaseKey);
