const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId, getRoleId } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ssd')
    .setDescription('Announce that the session has ended'),

  async execute(interaction) {
    const channelId = await getChannelId('ssd');
    const roleId = await getRoleId('ssuNotifications');
    const channel = await interaction.client.channels.fetch(channelId);

    const embed = buildEmbed('ssd', {
      footer: `Ended by ${interaction.user.tag}`,
      timestamp: true,
    });

    await channel.send({
      content: `<@&${roleId}>`,
      embeds: [embed],
      allowedMentions: { roles: [roleId] },
    });
    await interaction.reply({ content: '✅ SSD announcement sent.', ephemeral: true });
  },
};
