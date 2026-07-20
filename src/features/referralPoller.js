const supabase = require('../utils/supabaseClient');

const POLL_INTERVAL_MS = 2 * 60 * 1000;

function register(client) {
  client.once('ready', () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return console.error('[referralPoller] Guild not found — check GUILD_ID');

    pollReferrals(guild);
    setInterval(() => pollReferrals(guild), POLL_INTERVAL_MS);
    console.log('[referralPoller] Referral poller started (every 2 minutes)');
  });
}

async function pollReferrals(guild) {
  try {
    // Get all registered invite codes from Supabase
    const { data: registered, error: regErr } = await supabase
      .from('referrer_invites')
      .select('invite_code, user_id, username');
    if (regErr) throw regErr;
    if (!registered || registered.length === 0) return;

    const registeredCodes = new Set(registered.map((r) => r.invite_code));
    const codeToOwner = {};
    for (const r of registered) codeToOwner[r.invite_code] = r;

    // Fetch current invite use counts from Discord
    const discordInvites = await guild.invites.fetch();

    // Filter to only registered ones
    const relevant = discordInvites.filter((inv) => registeredCodes.has(inv.code));

    // Get last known snapshots from Supabase
    const { data: snapshots } = await supabase
      .from('referrer_invite_snapshot')
      .select('invite_code, uses')
      .in('invite_code', [...registeredCodes]);

    const snapshotMap = {};
    for (const s of snapshots || []) snapshotMap[s.invite_code] = s.uses;

    // Find invites whose use count increased
    const updates = [];
    const credits = [];

    for (const [code, inv] of relevant) {
      const lastUses = snapshotMap[code] ?? 0;
      const newUses = inv.uses;

      if (newUses > lastUses) {
        const diff = newUses - lastUses;
        credits.push({ owner: codeToOwner[code], diff });
      }

      updates.push({ invite_code: code, uses: newUses, updated_at: new Date().toISOString() });
    }

    // Also snapshot any registered codes that no longer exist on Discord (deleted invites)
    // — skip crediting those, just leave snapshot as-is

    // Update snapshots
    if (updates.length > 0) {
      await supabase.from('referrer_invite_snapshot').upsert(updates);
    }

    // Credit referrals
    for (const { owner, diff } of credits) {
      const { data: existing } = await supabase
        .from('referrer_counts')
        .select('referral_count')
        .eq('user_id', owner.user_id)
        .single();

      if (existing) {
        await supabase
          .from('referrer_counts')
          .update({
            referral_count: existing.referral_count + diff,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', owner.user_id);
      } else {
        await supabase.from('referrer_counts').insert({
          user_id: owner.user_id,
          username: owner.username,
          referral_count: diff,
        });
      }

      console.log(`[referralPoller] +${diff} referral(s) credited to ${owner.username}`);
    }
  } catch (err) {
    console.error('[referralPoller] Poll error:', err);
  }
}

module.exports = { register };
