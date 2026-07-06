const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId } = require('../utils/config');
const supabase = require('../utils/supabaseClient');

const STAR_CHOICES = [
  { name: '⭐', value: 1 },
  { name: '⭐⭐', value: 2 },
  { name: '⭐⭐⭐', value: 3 },
  { name: '⭐⭐⭐⭐', value: 4 },
  { name: '⭐⭐⭐⭐⭐', value: 5 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Feedback commands')
    .addSubcommand((sub) =>
      sub
        .setName('submit')
        .setDescription('Leave feedback for a staff member')
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The staff member this feedback is about').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('rating')
            .setDescription('Star rating')
            .setRequired(true)
            .addChoices(...STAR_CHOICES)
        )
        .addStringOption((opt) =>
          opt.setName('comments').setDescription('Additional feedback (optional)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription("View a staff member's feedback history")
        .addUserOption((opt) =>
          opt.setName('user').setDescription('The staff member to look up').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'submit') return submit(interaction);
    if (sub === 'list') return list(interaction);
  },
};

async function submit(interaction) {
  const target = interaction.options.getUser('user');
  const rating = interaction.options.getInteger('rating');
  const comments = interaction.options.getString('comments');

  const { error } = await supabase.from('feedback').insert({
    guild_id: interaction.guildId,
    target_user_id: target.id,
    target_user_tag: target.tag,
    rating,
    comments: comments || null,
    submitted_by_id: interaction.user.id,
    submitted_by_tag: interaction.user.tag,
  });
  if (error) throw new Error(`Failed to save feedback: ${error.message}`);

  const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  const channelId = await getChannelId('feedback');
  const channel = await interaction.client.channels.fetch(channelId);

  const fields = [
    { name: 'Staff Member', value: `${target}` },
    { name: 'Rating', value: stars },
  ];
  if (comments) fields.push({ name: 'Comments', value: comments });

  const embed = buildEmbed('feedback', {
    appendDescription: `Submitted by ${interaction.user}`,
    fields,
    timestamp: true,
  });

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: '✅ Feedback submitted, thank you!', ephemeral: true });
}

async function list(interaction) {
  const target = interaction.options.getUser('user');
  await interaction.deferReply();

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('target_user_id', target.id)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(`Failed to load feedback: ${error.message}`);

  if (!data || data.length === 0) {
    return interaction.editReply(`No feedback found for ${target.tag}.`);
  }

  const avg = (data.reduce((sum, row) => sum + row.rating, 0) / data.length).toFixed(1);

  const embed = new EmbedBuilder()
    .setTitle(`Feedback History — ${target.tag}`)
    .setColor('#5865F2')
    .setDescription(`Average rating: **${avg} / 5** (${data.length} shown, most recent first)`)
    .setThumbnail(target.displayAvatarURL());

  for (const row of data) {
    const stars = '⭐'.repeat(row.rating) + '☆'.repeat(5 - row.rating);
    const date = `<t:${Math.floor(new Date(row.created_at).getTime() / 1000)}:d>`;
    embed.addFields({
      name: `${stars} — ${date}`,
      value: `From: ${row.submitted_by_tag}${row.comments ? `\n${row.comments}` : ''}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
