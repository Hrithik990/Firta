const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Lazy singleton — created on first use, not at startup
// This prevents crashes on Vercel when env vars load after module init
let _client = null;

function getClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables. ' +
      'Add them in Vercel → Project Settings → Environment Variables.'
    );
  }

  _client = createClient(url, key);
  return _client;
}

// Proxy so existing code (supabase.from(...)) still works unchanged
const supabase = new Proxy({}, {
  get(_, prop) {
    return (...args) => getClient()[prop](...args);
  }
});

module.exports = supabase;
