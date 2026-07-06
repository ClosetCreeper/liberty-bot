require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    // Buttons (currently just the SSU vote button)
    if (interaction.isButton()) {
      if (interaction.customId === 'ssu-vote-button') {
        const ssuVote = client.commands.get('ssu-vote');
        await ssuVote.handleVote(interaction);
      }
      return;
    }

    // Modals (currently just the fastpass modal)
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'fastpass-modal') {
        const fastpass = client.commands.get('fastpass');
        await fastpass.handleModalSubmit(interaction);
      }
      return;
    }

    // /setup wizard: string select menus
    if (interaction.isStringSelectMenu()) {
      const setup = client.commands.get('setup');

      if (interaction.customId === 'setup-category-select') {
        await setup.handleCategorySelect(interaction);
        return;
      }

      if (interaction.customId.startsWith('setup-field-select:')) {
        const [, kind] = interaction.customId.split(':');
        await setup.handleFieldSelect(interaction, kind);
        return;
      }
      return;
    }

    // /setup wizard: channel/role select menus (the final step)
    if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      if (interaction.customId.startsWith('setup-value-select:')) {
        const [, kind, key] = interaction.customId.split(':');
        const setup = client.commands.get('setup');
        await setup.handleValueSelect(interaction, kind, key);
      }
      return;
    }
  } catch (err) {
    console.error(`Error handling interaction:`, err);

    const errorMessage = { content: `⚠️ Something went wrong: ${err.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorMessage).catch(() => {});
    } else {
      await interaction.reply(errorMessage).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
