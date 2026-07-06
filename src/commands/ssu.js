const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId, getRoleId } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ssu')
    .setDescription('Announce that the session has started'),

  async execute(interaction) {
    const channelId = await getChannelId('ssu');
    const roleId = await getRoleId('ssuNotifications');
    const channel = await interaction.client.channels.fetch(channelId);

    const embed = buildEmbed('ssu', {
      footer: `Started by ${interaction.user.tag}`,
      timestamp: true,
    });

    await channel.send({
      content: `<@&${roleId}>`,
      embeds: [embed],
      allowedMentions: { roles: [roleId] },
    });
    await interaction.reply({ content: '✅ SSU announcement sent.', ephemeral: true });
  },
};
