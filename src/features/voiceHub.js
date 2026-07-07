const { ChannelType } = require('discord.js');
const { getChannelId } = require('../utils/config');

const CHANNEL_NAME_PREFIX = 'Mod Scene';
const NAME_PATTERN = /^Mod Scene (\d+)$/;
const EMPTY_CHECK_DELAY_MS = 3000;

function register(client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      await handleJoin(oldState, newState);
      handleLeave(oldState, newState); // fire-and-forget, delayed check
    } catch (err) {
      console.error('Mod Scene Hub error:', err);
    }
  });
}

async function handleJoin(oldState, newState) {
  if (!newState.channelId) return; // this event was a leave, not a join
  if (oldState.channelId === newState.channelId) return; // no actual channel change

  let hubId;
  try {
    hubId = await getChannelId('mod-scene-hub');
  } catch {
    return; // not configured yet via /setup
  }

  if (newState.channelId !== hubId) return;

  const hubChannel = newState.channel;
  const guild = newState.guild;

  // Find the lowest unused "Mod Scene N" number in the same category as the hub
  const existingNumbers = new Set();
  guild.channels.cache.forEach((ch) => {
    if (ch.type === ChannelType.GuildVoice && ch.parentId === hubChannel.parentId) {
      const match = ch.name.match(NAME_PATTERN);
      if (match) existingNumbers.add(Number(match[1]));
    }
  });

  let n = 1;
  while (existingNumbers.has(n)) n++;

  const newChannel = await guild.channels.create({
    name: `${CHANNEL_NAME_PREFIX} ${n}`,
    type: ChannelType.GuildVoice,
    parent: hubChannel.parentId || undefined,
    permissionOverwrites: hubChannel.permissionOverwrites.cache.map((ow) => ({
      id: ow.id,
      type: ow.type,
      allow: ow.allow,
      deny: ow.deny,
    })),
  });

  await newState.member.voice.setChannel(newChannel).catch(() => {});
}

function handleLeave(oldState, newState) {
  if (!oldState.channelId) return;
  if (oldState.channelId === newState.channelId) return;

  const channel = oldState.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) return;
  if (!NAME_PATTERN.test(channel.name)) return; // only ever delete channels we created

  setTimeout(async () => {
    try {
      if (channel.members.size === 0) {
        await channel.delete('Mod Scene channel empty');
      }
    } catch {
      // Already deleted, or missing permissions — safe to ignore
    }
  }, EMPTY_CHECK_DELAY_MS);
}

module.exports = { register };
