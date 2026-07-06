const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId } = require('../utils/config');
const supabase = require('../utils/supabaseClient');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion')
    .setDescription('Promotion commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('give')
        .setDescription('Promote a member and announce it')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The member being promoted').setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The new role').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason for the promotion').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription("View a member's promotion history")
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The member to look up').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'give') return give(interaction);
    if (sub === 'list') return list(interaction);
  },
};

async function give(interaction) {
  const target = interaction.options.getUser('user');
  const role = interaction.options.getRole('role');
  const reason = interaction.options.getString('reason');

  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
  }

  const botMember = await interaction.guild.members.fetchMe();
  if (role.position >= botMember.roles.highest.position) {
    return interaction.reply({
      content: `I can't assign **${role.name}** — it's above or equal to my highest role. Move my role above it in Server Settings > Roles.`,
      ephemeral: true,
    });
  }

  if (member.roles.cache.has(role.id)) {
    return interaction.reply({
      content: `${target.tag} already has the **${role.name}** role.`,
      ephemeral: true,
    });
  }

  await member.roles.add(role, reason);

  const { error } = await supabase.from('promotions').insert({
    guild_id: interaction.guildId,
    user_id: target.id,
    user_tag: target.tag,
    role_id: role.id,
    role_name: role.name,
    reason,
    moderator_id: interaction.user.id,
    moderator_tag: interaction.user.tag,
  });
  if (error) throw new Error(`Failed to save promotion: ${error.message}`);

  const channelId = await getChannelId('promotion');
  const channel = await interaction.client.channels.fetch(channelId);
  const embed = buildEmbed('promotion', {
    appendDescription: `Congratulations, ${target}!`,
    fields: [
      { name: 'New Role', value: `${role}`, inline: true },
      { name: 'Promoted By', value: interaction.user.tag, inline: true },
      { name: 'Reason', value: reason },
    ],
    timestamp: true,
  });

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: '✅ Promotion announced.', ephemeral: true });
}

async function list(interaction) {
  const target = interaction.options.getUser('user');
  await interaction.deferReply();

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('user_id', target.id)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`Failed to load promotions: ${error.message}`);

  if (!data || data.length === 0) {
    return interaction.editReply(`No promotion history found for ${target.tag}.`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`Promotion History — ${target.tag}`)
    .setColor('#57F287')
    .setDescription(`${data.length} shown, most recent first`)
    .setThumbnail(target.displayAvatarURL());

  for (const row of data) {
    const date = `<t:${Math.floor(new Date(row.created_at).getTime() / 1000)}:d>`;
    embed.addFields({
      name: `${row.role_name} — ${date}`,
      value: `By: ${row.moderator_tag}\nReason: ${row.reason}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
