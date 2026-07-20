const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('training-host')
    .setDescription('Announce a training session')
    .addStringOption((opt) =>
      opt.setName('duration').setDescription('How long the training will run (e.g. 30 minutes)').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('when')
        .setDescription('When it starts — include the timezone (e.g. 8:00 PM EST)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const duration = interaction.options.getString('duration');
    const when = interaction.options.getString('when');

    const channelId = await getChannelId('training-host');
    const channel = await interaction.client.channels.fetch(channelId);

    const embed = buildEmbed('training-host', {
      fields: [
        { name: 'Host', value: interaction.user.tag, inline: true },
        { name: 'Duration', value: duration, inline: true },
        { name: 'When', value: when, inline: true },
      ],
      timestamp: true,
    });

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Training announcement sent.', ephemeral: true });
  },
};
