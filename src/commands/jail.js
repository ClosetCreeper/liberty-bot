const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getRoleId } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('Give a member the Jailed role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The member to jail').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for jailing').setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const jailedRoleId = await getRoleId('jailed');

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }

    if (member.roles.cache.has(jailedRoleId)) {
      return interaction.reply({ content: 'That member is already jailed.', ephemeral: true });
    }

    await member.roles.add(jailedRoleId, reason);

    const embed = new EmbedBuilder()
      .setTitle('Member Jailed')
      .setColor('#992D22')
      .addFields(
        { name: 'User', value: `${target.tag} (${target.id})` },
        { name: 'Moderator', value: interaction.user.tag },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
