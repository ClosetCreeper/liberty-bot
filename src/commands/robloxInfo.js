const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox-info')
    .setDescription('Look up a Roblox user by username')
    .addStringOption((opt) =>
      opt.setName('username').setDescription('Roblox username').setRequired(true)
    ),

  async execute(interaction) {
    const username = interaction.options.getString('username');
    await interaction.deferReply();

    // Step 1: resolve username -> userId
    const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    const lookupData = await lookupRes.json();
    const match = lookupData?.data?.[0];

    if (!match) {
      return interaction.editReply(`No Roblox user found for **${username}**.`);
    }

    // Step 2: user details
    const detailsRes = await fetch(`https://users.roblox.com/v1/users/${match.id}`);
    const details = await detailsRes.json();

    // Step 3: avatar headshot thumbnail
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${match.id}&size=420x420&format=Png&isCircular=false`
    );
    const thumbData = await thumbRes.json();
    const avatarUrl = thumbData?.data?.[0]?.imageUrl;

    const created = new Date(details.created);

    const embed = new EmbedBuilder()
      .setTitle(details.displayName ? `${details.displayName} (@${details.name})` : details.name)
      .setURL(`https://www.roblox.com/users/${match.id}/profile`)
      .setColor('#5865F2')
      .addFields(
        { name: 'User ID', value: `${match.id}`, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(created.getTime() / 1000)}:D>`, inline: true },
        { name: 'Banned', value: details.isBanned ? 'Yes' : 'No', inline: true }
      );

    if (details.description) {
      embed.addFields({ name: 'Description', value: details.description.slice(0, 1024) });
    }
    if (avatarUrl) embed.setThumbnail(avatarUrl);

    await interaction.editReply({ embeds: [embed] });
  },
};
