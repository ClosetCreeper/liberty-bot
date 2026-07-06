const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Time out a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to time out').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('minutes')
        .setDescription('Timeout duration in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320) // Discord's max timeout is 28 days
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the timeout').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({
        content: "I can't time out that member (role hierarchy or missing permissions).",
        ephemeral: true,
      });
    }

    await member.timeout(minutes * 60 * 1000, reason);

    const embed = new EmbedBuilder()
      .setTitle('Member Timed Out')
      .setColor('#ED4245')
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})` },
        { name: 'Duration', value: `${minutes} minute(s)` },
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
