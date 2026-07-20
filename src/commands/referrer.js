const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabaseClient');
const { getChannelId, getRoleId } = require('../utils/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('referrer')
    .setDescription('Referral link management')
    .addSubcommand((sub) =>
      sub.setName('link').setDescription('Get your unique referral invite link')
    )
    .addSubcommand((sub) =>
      sub.setName('leaderboard').setDescription('See the referral leaderboard')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'link') return link(interaction);
    if (sub === 'leaderboard') return leaderboard(interaction);
  },
};

async function link(interaction) {
  const trackedRoleId = await getRoleId('referralTracked');
  if (!interaction.member.roles.cache.has(trackedRoleId)) {
    return interaction.reply({ content: '❌ You need the staff role to use this.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  // Check if they already have an invite
  const { data: existing } = await supabase
    .from('referrer_invites')
    .select('invite_code')
    .eq('user_id', interaction.user.id)
    .single();

  if (existing) {
    // Verify the invite still exists on Discord
    const invites = await interaction.guild.invites.fetch();
    const stillValid = invites.has(existing.invite_code);

    if (stillValid) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Your Referral Link')
            .setColor('#5865F2')
            .setDescription(`https://discord.gg/${existing.invite_code}`)
            .setFooter({ text: 'Share this link to earn referral points!' }),
        ],
      });
    }

    // Invite was deleted — remove from DB and create a new one
    await supabase.from('referrer_invites').delete().eq('user_id', interaction.user.id);
  }

  // Create a new invite
  const channelId = await getChannelId('referral-invite');
  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.editReply('❌ Could not find the referral invite channel. Run /setup to configure it.');
  }

  const invite = await channel.createInvite({
    maxAge: 0, // never expires
    maxUses: 0, // unlimited uses
    unique: true,
    reason: `Referral link for ${interaction.user.username}`,
  });

  await supabase.from('referrer_invites').insert({
    user_id: interaction.user.id,
    username: interaction.member.displayName,
    invite_code: invite.code,
  });

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle('Your Referral Link')
        .setColor('#57F287')
        .setDescription(`https://discord.gg/${invite.code}`)
        .setFooter({ text: 'Share this link to earn referral points!' }),
    ],
  });
}

async function leaderboard(interaction) {
  await interaction.deferReply();

  const { data: rows, error } = await supabase
    .from('referrer_counts')
    .select('*')
    .order('referral_count', { ascending: false })
    .limit(25);
  if (error) throw new Error(`Failed to load referral leaderboard: ${error.message}`);

  if (!rows || rows.length === 0) {
    return interaction.editReply({ content: 'No referrals have been recorded yet.' });
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = rows.map((row, i) => {
    const prefix = medals[i] || `**${i + 1}.**`;
    const word = row.referral_count === 1 ? 'referral' : 'referrals';
    return `${prefix} **${row.username}** — ${row.referral_count} ${word}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🔗 Referral Leaderboard')
    .setColor('#5865F2')
    .setDescription(lines.join('\n'))
    .setTimestamp()
    .setFooter({ text: 'Points awarded when someone joins using your link' });

  return interaction.editReply({ embeds: [embed] });
}
