require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn(
    'SUPABASE_URL / SUPABASE_KEY are not set — Supabase-backed features (config, /setup, list commands) will fail.'
  );
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = supabase;
