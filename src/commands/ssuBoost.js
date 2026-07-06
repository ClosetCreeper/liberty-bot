const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId, getRoleId } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ssu-boost')
    .setDescription('Ask for more players to join the current session'),

  async execute(interaction) {
    const channelId = await getChannelId('ssu-boost');
    const roleId = await getRoleId('ssuNotifications');
    const channel = await interaction.client.channels.fetch(channelId);

    const embed = buildEmbed('ssu-boost', {
      footer: `Requested by ${interaction.user.tag}`,
      timestamp: true,
    });

    await channel.send({
      content: `<@&${roleId}>`,
      embeds: [embed],
      allowedMentions: { roles: [roleId] },
    });
    await interaction.reply({ content: '✅ SSU boost sent.', ephemeral: true });
  },
};
