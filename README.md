# Discord Embed-Template Bot

A template-driven Discord bot. Announcement-style embeds live in `config/embeds.json`
so you can tweak title/description/color/banner without touching code. Channel
routing and role IDs are stored in **Supabase** and editable live via `/setup`.
Infraction, promotion, and feedback records are also logged to Supabase so they
can be looked up with the `list` subcommands.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `DISCORD_TOKEN` — from the Discord Developer Portal (Bot tab)
- `CLIENT_ID` — your application's ID (General Information tab)
- `GUILD_ID` — your server's ID (right-click server icon → Copy Server ID, with
  Developer Mode on)
- `SUPABASE_URL` / `SUPABASE_KEY` — from your Supabase project's Settings > API.
  Use the **service role key**, not the anon key — this bot runs server-side
  and needs to read/write config and logs directly.

### Supabase schema

Open the SQL editor in your Supabase project and run `sql/schema.sql`. This
creates:
- `bot_config` — key/value store for channel + role settings, edited via `/setup`
- `infractions`, `promotions`, `feedback` — one row per logged action, queried
  by the `list` subcommands
- `referrer_invites`, `referrer_invite_snapshot`, `referrer_counts` — referral
  program tables. These are the **same tables msgquota-bot uses** — point
  `SUPABASE_URL`/`SUPABASE_KEY` at that same project and both bots share one
  set of referral data. The `create table if not exists` statements are
  no-ops if msgquota-bot already created them.

Nothing needs to be pre-filled — `/setup` populates `bot_config` for you.

### Register commands and run

```bash
npm run deploy   # registers commands to your guild — rerun any time you add/edit a command
npm start        # starts the bot
```

For EC2, same pattern as your other bots: `systemctl`, `ExecStart=/usr/bin/node
src/index.js`, `WorkingDirectory=` set to this folder, env vars in an
`EnvironmentFile=`.

## Configuring channels and roles — `/setup`

Run `/setup` (requires Manage Server permission). It's a small wizard:

1. Pick a category: **Channels** or **Roles**
2. Pick which one you want to set (e.g. "SSU Announcements", "Jailed Role")
3. Pick the actual channel or role using Discord's native picker
4. Confirmation message shows what was saved

Everything writes straight to the `bot_config` table in Supabase and takes
effect on the next command (there's a 30-second cache so back-to-back
commands don't all hit the database).

**Fastpass questions are intentionally not in `/setup`** — they're hardcoded
in `src/constants/fastpassQuestions.js`. Edit that file and redeploy to change them.

## The embed template file — `config/embeds.json`

Each entry maps a command to its embed content:

```json
"ssu": {
  "title": "Session Started",
  "description": "The session has started, please join in game!",
  "color": "#57F287",
  "banner": ""
}
```

- `banner` is optional — leave it `""` to omit, or set an image URL to add one.
- `color` is a hex string.
- Commands that build dynamic content (feedback, promotion, infraction,
  fastpass) use the template for title/color/banner, and add their own fields
  on top via `buildEmbed()` overrides in `src/utils/embeds.js`.

### Adding a new pure-announcement command

1. Add an entry to `embeds.json`.
2. Add the channel to `SETTABLE.channel` in `src/utils/config.js` so it shows
   up in `/setup`, then set it with `/setup`.
3. Copy `src/commands/ssu.js`, rename it, swap the template key + channel key.
4. Run `npm run deploy`.

## Commands implemented

| Command | Behavior |
|---|---|
| `/ssu` | Pings the SSU notifications role, posts the SSU template embed to the SSU channel |
| `/ssd` | Same, for session end |
| `/ssu-boost` | Same, for boost requests |
| `/ssu-vote votes-needed:<n>` | Posts a vote button; once `n` unique members vote, deletes the vote message and posts the SSU embed (with role ping) |
| `/kick user reason` | Kicks the member |
| `/ban user reason` | Bans the member |
| `/timeout user minutes reason` | Times out the member |
| `/jail user reason` | Adds the configured Jailed role |
| `/fastpass` | Opens a modal (hardcoded questions), posts answers to the fastpass channel |
| `/feedback submit user rating comments` | Logs to Supabase + posts a star-rated embed to the feedback channel |
| `/feedback list user` | Shows a member's feedback history + average rating |
| `/roblox-info username` | Looks up a Roblox user via the public Roblox API |
| `/promotion give user role reason` | **Adds the role to the member**, logs to Supabase, posts an embed to the promotion channel |
| `/promotion list user` | Shows a member's promotion history |
| `/infraction log user type reason` | Logs to Supabase + posts a color-coded embed to the infraction channel |
| `/infraction list user` | Shows a member's infraction history |
| `/referrer link` | Creates (or returns) the caller's permanent invite link, requires the Referral Tracked role |
| `/referrer leaderboard` | Shows top referrers by credited invite joins |
| `/training-host duration when` | Posts a training announcement (host, duration, start time) to the configured channel |
| `/setup` | Configure channels and roles via dropdowns |

`/referrer` requires two extra `/setup` entries: the **Referral Invite
Channel** (where invite links are created from) and the **Referral Tracked
Role** (who's allowed to run `/referrer link`). A background poller checks
Discord's invite use-counts every 2 minutes and credits `referrer_counts`
when a tracked invite gets a new use — this requires the `GuildInvites`
intent, which is already enabled in `src/index.js` (no privileged-intent
toggle needed in the Developer Portal for it).

> Note: `/feedback`, `/promotion`, and `/infraction` are now **subcommands**
> (`/feedback submit`, `/promotion give`, `/infraction log`) instead of flat
> commands — Discord doesn't allow mixing top-level options with subcommands
> under the same command name, so this was required to add the `list` views.

## Not implemented yet (as requested)

- Tickets
- Server info
- Log from in-game
- LOA request

## Notes / things worth double-checking before go-live

- `/ban`, `/kick`, `/timeout`, `/jail`, `/infraction`, `/promotion` are
  restricted by default Discord permissions — adjust per-command permissions
  in your server's Integrations settings if needed.
- SSU vote counts are stored in memory — a bot restart mid-vote resets it.
- Roblox API calls are unauthenticated public endpoints — no key needed, but
  they're rate-limited.
- The `bot_config` cache is 30 seconds. If you run `/setup` and then
  immediately test the affected command from a *different* process/instance,
  you generally won't notice this — but back-to-back automated tests might.
