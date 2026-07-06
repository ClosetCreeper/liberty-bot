const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId } = require('../utils/config');
const supabase = require('../utils/supabaseClient');

const INFRACTION_TYPES = [
  { name: 'Warning', value: 'Warning' },
  { name: 'Strike', value: 'Strike' },
  { name: 'ZTP', value: 'ZTP' },
  { name: 'Demotion', value: 'Demotion' },
  { name: 'Termination', value: 'Termination' },
];

const TYPE_COLORS = {
  Warning: '#FEE75C',
  Strike: '#F57C00',
  ZTP: '#E67E22',
  Demotion: '#992D22',
  Termination: '#ED4245',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Infraction commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('log')
        .setDescription('Log an infraction for a member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The member receiving the infraction').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Type of infraction')
            .setRequired(true)
            .addChoices(...INFRACTION_TYPES)
        )
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason for the infraction').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription("View a member's infraction history")
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The member to look up').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'log') return log(interaction);
    if (sub === 'list') return list(interaction);
  },
};

async function log(interaction) {
  const target = interaction.options.getUser('user');
  const type = interaction.options.getString('type');
  const reason = interaction.options.getString('reason');

  const { error } = await supabase.from('infractions').insert({
    guild_id: interaction.guildId,
    user_id: target.id,
    user_tag: target.tag,
    type,
    reason,
    moderator_id: interaction.user.id,
    moderator_tag: interaction.user.tag,
  });
  if (error) throw new Error(`Failed to save infraction: ${error.message}`);

  const channelId = await getChannelId('infraction');
  const channel = await interaction.client.channels.fetch(channelId);
  const embed = buildEmbed('infraction', {
    appendDescription: `**Member:** ${target}`,
    fields: [
      { name: 'Type', value: type, inline: true },
      { name: 'Issued By', value: interaction.user.tag, inline: true },
      { name: 'Reason', value: reason },
    ],
    timestamp: true,
  });

  if (TYPE_COLORS[type]) embed.setColor(TYPE_COLORS[type]);

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: '✅ Infraction logged.', ephemeral: true });
}

async function list(interaction) {
  const target = interaction.options.getUser('user');
  await interaction.deferReply();

  const { data, error } = await supabase
    .from('infractions')
    .select('*')
    .eq('user_id', target.id)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`Failed to load infractions: ${error.message}`);

  if (!data || data.length === 0) {
    return interaction.editReply(`No infraction history found for ${target.tag}.`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`Infraction History — ${target.tag}`)
    .setColor('#ED4245')
    .setDescription(`${data.length} shown, most recent first`)
    .setThumbnail(target.displayAvatarURL());

  for (const row of data) {
    const date = `<t:${Math.floor(new Date(row.created_at).getTime() / 1000)}:d>`;
    embed.addFields({
      name: `${row.type} — ${date}`,
      value: `By: ${row.moderator_tag}\nReason: ${row.reason}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
