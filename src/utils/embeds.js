const { EmbedBuilder } = require('discord.js');
const { getEmbeds } = require('./config');

/**
 * Build an embed from config/embeds.json.
 *
 * @param {string} templateKey - key in embeds.json, e.g. "ssu"
 * @param {object} overrides - optional overrides / additions:
 *    {
 *      description: "replace or append the template description",
 *      appendDescription: "text appended on a new line after the template description",
 *      banner: "https://... (overrides template banner)",
 *      author: { name, iconURL },
 *      fields: [{ name, value, inline }],
 *      footer: "text",
 *      timestamp: true
 *    }
 */
function buildEmbed(templateKey, overrides = {}) {
  const templates = getEmbeds();
  const template = templates[templateKey];

  if (!template) {
    throw new Error(`No embed template found for "${templateKey}" in embeds.json`);
  }

  const embed = new EmbedBuilder()
    .setTitle(template.title || null)
    .setColor(template.color || '#5865F2');

  let description = overrides.description ?? template.description ?? '';
  if (overrides.appendDescription) {
    description = description
      ? `${description}\n\n${overrides.appendDescription}`
      : overrides.appendDescription;
  }
  if (description) embed.setDescription(description);

  const banner = overrides.banner || template.banner;
  if (banner) embed.setImage(banner);

  if (overrides.author) embed.setAuthor(overrides.author);
  if (overrides.fields) embed.addFields(overrides.fields);
  if (overrides.footer) embed.setFooter({ text: overrides.footer });
  if (overrides.timestamp) embed.setTimestamp();

  return embed;
}

module.exports = { buildEmbed };
