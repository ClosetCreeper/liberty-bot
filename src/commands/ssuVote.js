const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId, getRoleId } = require('../utils/config');

// messageId -> { votesNeeded, voters: Set<userId> }
// In-memory only: votes reset if the bot restarts. Fine for a same-session
// vote-to-start check; revisit with persistence if that's ever a problem.
const activeVotes = new Map();

function buildVoteEmbed(votesNeeded, currentCount) {
  return new EmbedBuilder()
    .setTitle('SSU Vote')
    .setDescription(
      `React below to vote to start the session!\n\n**${currentCount}/${votesNeeded}** votes`
    )
    .setColor('#FEE75C');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ssu-vote')
    .setDescription('Start a vote to trigger an SSU once enough people vote')
    .addIntegerOption((opt) =>
      opt
        .setName('votes-needed')
        .setDescription('How many votes are required to trigger the SSU')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const votesNeeded = interaction.options.getInteger('votes-needed');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ssu-vote-button')
        .setLabel('Vote to SSU')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    const reply = await interaction.reply({
      embeds: [buildVoteEmbed(votesNeeded, 0)],
      components: [row],
      fetchReply: true,
    });

    activeVotes.set(reply.id, { votesNeeded, voters: new Set() });
  },

  // Called from the button interaction handler in index.js
  async handleVote(interaction) {
    const voteData = activeVotes.get(interaction.message.id);
    if (!voteData) {
      await interaction.reply({
        content: 'This vote has expired or already finished.',
        ephemeral: true,
      });
      return;
    }

    if (voteData.voters.has(interaction.user.id)) {
      await interaction.reply({ content: 'You already voted!', ephemeral: true });
      return;
    }

    voteData.voters.add(interaction.user.id);
    const currentCount = voteData.voters.size;

    if (currentCount >= voteData.votesNeeded) {
      activeVotes.delete(interaction.message.id);

      // Remove the vote message
      await interaction.message.delete().catch(() => {});

      // Send the SSU embed to the configured SSU channel
      const channelId = await getChannelId('ssu');
      const roleId = await getRoleId('ssuNotifications');
      const channel = await interaction.client.channels.fetch(channelId);
      const embed = buildEmbed('ssu', {
        appendDescription: `*Triggered by community vote (${voteData.votesNeeded} votes reached).*`,
        timestamp: true,
      });
      await channel.send({
        content: `<@&${roleId}>`,
        embeds: [embed],
        allowedMentions: { roles: [roleId] },
      });

      // Acknowledge the interaction since the source message is gone
      await interaction.deferUpdate().catch(() => {});
      return;
    }

    await interaction.update({
      embeds: [buildVoteEmbed(voteData.votesNeeded, currentCount)],
    });
  },
};
