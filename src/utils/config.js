const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');

const EMBEDS_PATH = path.join(__dirname, '..', '..', 'config', 'embeds.json');

// Embed templates (title/description/color/banner) stay in a local file —
// only channels and roles live in Supabase.
function getEmbeds() {
  return JSON.parse(fs.readFileSync(EMBEDS_PATH, 'utf-8'));
}

// Everything /setup is allowed to edit. Used to build the dropdown options
// and to validate keys before writing.
const SETTABLE = {
  channel: [
    { key: 'ssu', label: 'SSU Announcements' },
    { key: 'ssd', label: 'SSD Announcements' },
    { key: 'ssu-boost', label: 'SSU Boost' },
    { key: 'feedback', label: 'Feedback Log' },
    { key: 'promotion', label: 'Promotion Log' },
    { key: 'infraction', label: 'Infraction Log' },
    { key: 'fastpass', label: 'Fastpass Requests' },
    { key: 'mod-scene-hub', label: 'Mod Scene Hub (voice channel)', channelKind: 'voice' },
    { key: 'referral-invite', label: 'Referral Invite Channel' },
  ],
  role: [
    { key: 'jailed', label: 'Jailed Role' },
    { key: 'ssuNotifications', label: 'SSU Notifications Role' },
    { key: 'referralTracked', label: 'Referral Tracked Role' },
  ],
};

// Small in-memory cache so every command invocation doesn't hit Supabase.
// /setup writes call invalidateCache() so changes take effect immediately.
let cache = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

async function loadAll() {
  const { data, error } = await supabase.from('bot_config').select('key, value');
  if (error) throw new Error(`Failed to load config from Supabase: ${error.message}`);

  const map = {};
  for (const row of data) map[row.key] = row.value;
  cache = map;
  cacheLoadedAt = Date.now();
  return map;
}

async function getAll() {
  if (!cache || Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await loadAll();
  }
  return cache;
}

function invalidateCache() {
  cache = null;
}

function assertConfigured(value, label) {
  if (!value) {
    throw new Error(`${label} isn't configured yet. Run /setup to set it.`);
  }
  return value;
}

async function getChannelId(key) {
  const all = await getAll();
  return assertConfigured(all[`channel:${key}`], `The "${key}" channel`);
}

async function getRoleId(key) {
  const all = await getAll();
  return assertConfigured(all[`role:${key}`], `The "${key}" role`);
}

async function setConfigValue(kind, key, value) {
  const fullKey = `${kind}:${key}`;
  const { error } = await supabase
    .from('bot_config')
    .upsert({ key: fullKey, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save config: ${error.message}`);
  invalidateCache();
}

module.exports = { getAll, getEmbeds, getChannelId, getRoleId, setConfigValue, invalidateCache, SETTABLE };
