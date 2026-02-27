const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { query } = require('../../utils/db');

const STAFF_ROLE_IDS = ['982731220913913856', '958703198447755294', '1410661468688482314', '1457664338163667072', '1354402446994309123'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item-add')
    .setDescription('Add a new Growtopia item to track (Staff only)')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Item name (e.g., "rayman")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Item description (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('rarity')
        .setDescription('Item rarity')
        .setRequired(false)
        .addChoices(
          { name: 'Common', value: 'common' },
          { name: 'Uncommon', value: 'uncommon' },
          { name: 'Rare', value: 'rare' },
          { name: 'Epic', value: 'epic' },
          { name: 'Legendary', value: 'legendary' }
        )
    )
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Item category (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const member = interaction.member;

    // Check if user is staff
    const hasStaffRole = member.roles.cache.some(role => STAFF_ROLE_IDS.includes(role.id));
    const hasAdminPermission = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasStaffRole && !hasAdminPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command. Staff only.',
        ephemeral: true
      });
    }

    const itemName = interaction.options.getString('name').toLowerCase().trim();
    const description = interaction.options.getString('description') || null;
    const rarity = interaction.options.getString('rarity') || null;
    const category = interaction.options.getString('category') || null;

    await interaction.deferReply();

    try {
      // Check if item already exists
      const existing = await query('SELECT id FROM gt_items WHERE item_name = ?', [itemName]);
      
      if (existing.length > 0) {
        return interaction.editReply({
          content: `❌ Item **${itemName}** already exists in the database!`
        });
      }

      // Add item to database
      const result = await query(
        'INSERT INTO gt_items (item_name, description, rarity, category, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [itemName, description, rarity, category, Date.now(), interaction.user.id]
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Item Added Successfully')
        .setDescription(`**${itemName}** has been added to the Growtopia price tracking system!`)
        .addFields(
          { name: '📦 Item Name', value: itemName, inline: true },
          { name: '🎯 Rarity', value: rarity || 'Not specified', inline: true },
          { name: '📁 Category', value: category || 'Not specified', inline: true }
        )
        .setColor('#FF0000')
        .setFooter({ text: `Added by ${interaction.user.tag}` })
        .setTimestamp();

      if (description) {
        embed.addFields({ name: '📝 Description', value: description });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Item add error:', error);
      await interaction.editReply({
        content: '❌ An error occurred while adding the item. Please try again.'
      });
    }
  },
};
