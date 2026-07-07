const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { SETTABLE, setConfigValue } = require('../utils/config');

const CATEGORY_DESCRIPTIONS = {
  channel: 'Choose which announcement/log destination you want to (re)point to a channel.',
  role: 'Choose which role slot you want to (re)assign.',
};

function categoryScreen() {
  const embed = new EmbedBuilder()
    .setTitle('Bot Setup')
    .setColor('#5865F2')
    .setDescription('What do you want to configure?');

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup-category-select')
      .setPlaceholder('Choose a category')
      .addOptions(
        { label: 'Channels', value: 'channel', description: 'Where each embed gets sent' },
        { label: 'Roles', value: 'role', description: 'Jailed role, SSU notifications role' }
      )
  );

  return { embeds: [embed], components: [row] };
}

function fieldScreen(kind) {
  const embed = new EmbedBuilder()
    .setTitle(kind === 'channel' ? 'Channels' : 'Roles')
    .setColor('#5865F2')
    .setDescription(CATEGORY_DESCRIPTIONS[kind]);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`setup-field-select:${kind}`)
      .setPlaceholder(`Choose a ${kind}`)
      .addOptions(SETTABLE[kind].map((item) => ({ label: item.label, value: item.key })))
  );

  return { embeds: [embed], components: [row] };
}

function valueScreen(kind, key) {
  const entry = SETTABLE[kind].find((item) => item.key === key);
  const label = entry?.label || key;

  const embed = new EmbedBuilder()
    .setTitle(label)
    .setColor('#5865F2')
    .setDescription(
      kind === 'channel'
        ? `Pick the channel that **${label}** should send to.`
        : `Pick the role for **${label}**.`
    );

  const isVoiceChannel = kind === 'channel' && entry?.channelKind === 'voice';

  const component =
    kind === 'channel'
      ? new ChannelSelectMenuBuilder()
          .setCustomId(`setup-value-select:channel:${key}`)
          .setPlaceholder('Select a channel')
          .addChannelTypes(
            isVoiceChannel ? ChannelType.GuildVoice : ChannelType.GuildText,
            ...(isVoiceChannel ? [] : [ChannelType.GuildAnnouncement])
          )
      : new RoleSelectMenuBuilder()
          .setCustomId(`setup-value-select:role:${key}`)
          .setPlaceholder('Select a role');

  const row = new ActionRowBuilder().addComponents(component);
  return { embeds: [embed], components: [row] };
}

function confirmationScreen(kind, key, mention) {
  const label = SETTABLE[kind].find((item) => item.key === key)?.label || key;
  const embed = new EmbedBuilder()
    .setTitle('✅ Saved')
    .setColor('#57F287')
    .setDescription(`**${label}** is now set to ${mention}.`);

  return { embeds: [embed], components: [] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the bot (channels and roles)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply({ ...categoryScreen(), ephemeral: true });
  },

  // Routed from index.js based on customId prefix
  async handleCategorySelect(interaction) {
    const kind = interaction.values[0]; // 'channel' | 'role'
    await interaction.update(fieldScreen(kind));
  },

  async handleFieldSelect(interaction, kind) {
    const key = interaction.values[0];
    await interaction.update(valueScreen(kind, key));
  },

  async handleValueSelect(interaction, kind, key) {
    const selectedId = interaction.values[0];
    await setConfigValue(kind, key, selectedId);

    const mention = kind === 'channel' ? `<#${selectedId}>` : `<@&${selectedId}>`;
    await interaction.update(confirmationScreen(kind, key, mention));
  },
};
