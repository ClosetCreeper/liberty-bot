const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { buildEmbed } = require('../utils/embeds');
const { getChannelId } = require('../utils/config');
const FASTPASS_QUESTIONS = require('../constants/fastpassQuestions');

const MODAL_ID = 'fastpass-modal';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fastpass')
    .setDescription('Request a fastpass'),

  async execute(interaction) {
    // Discord modals support a max of 5 inputs
    const questions = FASTPASS_QUESTIONS.slice(0, 5);

    const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle('Fastpass Request');

    questions.forEach((question, i) => {
      const input = new TextInputBuilder()
        .setCustomId(`fastpass-q-${i}`)
        .setLabel(question.slice(0, 45)) // Discord label limit
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
    });

    await interaction.showModal(modal);
  },

  // Called from the modal submit handler in index.js
  async handleModalSubmit(interaction) {
    const questions = FASTPASS_QUESTIONS.slice(0, 5);

    const fields = questions.map((question, i) => ({
      name: question,
      value: interaction.fields.getTextInputValue(`fastpass-q-${i}`),
    }));

    const channelId = await getChannelId('fastpass');
    const channel = await interaction.client.channels.fetch(channelId);
    const embed = buildEmbed('fastpass', {
      appendDescription: `Requested by ${interaction.user} (${interaction.user.tag})`,
      fields,
      timestamp: true,
    });

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Fastpass request submitted.', ephemeral: true });
  },
};
