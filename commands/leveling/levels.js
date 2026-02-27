/**
 * /levels — Show the level rewards table and XP requirements.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelSystem = require('../../utils/levelSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levels')
        .setDescription('View the level rewards table and XP requirements'),

    async execute(interaction) {
        await interaction.deferReply();

        const { guild } = interaction;
        const levelRoles = await levelSystem.getLevelRoles(guild.id);

        // Build a table showing levels 1-30 with XP requirements
        const rows = [];
        for (let lvl = 1; lvl <= 30; lvl++) {
            const xpRequired = levelSystem.totalXpForLevel(lvl);
            const reward = levelRoles.find(r => r.level === lvl);
            const role = reward ? guild.roles.cache.get(reward.role_id) : null;
            rows.push({ lvl, xpRequired, role });
        }

        // Split into two columns
        const col1 = rows.slice(0, 15);
        const col2 = rows.slice(15, 30);

        function formatRow(r) {
            const roleStr = r.role ? ` → <@&${r.role.id}>` : '';
            return `**Lv.${r.lvl}** — \`${r.xpRequired.toLocaleString()} XP\`${roleStr}`;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('📈 Level Rewards & XP Requirements')
            .setDescription(
                '> Earn XP by chatting! Messages, links, and images all give different XP amounts.\n' +
                '> A **60-second cooldown** prevents spam farming.\n\u200b'
            )
            .addFields(
                {
                    name: 'Levels 1–15',
                    value: col1.map(formatRow).join('\n'),
                    inline: true,
                },
                {
                    name: 'Levels 16–30',
                    value: col2.map(formatRow).join('\n'),
                    inline: true,
                }
            );

        // XP per message type
        embed.addFields({
            name: '⚡ XP Per Activity',
            value: [
                `💬 **Message** — 15–25 XP`,
                `🔗 **Link** — 15–25 XP`,
                `🖼️ **Image** — 15–25 XP`,
                `🔗🖼️ **Link + Image** — 15–25 XP`,
                `⏱️ **Cooldown** — 60 seconds`,
            ].join('\n'),
            inline: false,
        });

        if (levelRoles.length > 0) {
            const rewardLines = levelRoles.map(r => {
                const role = guild.roles.cache.get(r.role_id);
                return `**Level ${r.level}** → ${role ? `<@&${role.id}>` : `~~Deleted Role~~`}`;
            });
            embed.addFields({
                name: '🏆 Role Rewards',
                value: rewardLines.join('\n'),
                inline: false,
            });
        } else {
            embed.addFields({
                name: '🏆 Role Rewards',
                value: 'No role rewards configured yet. Admins can use `/level-config set-role` to add them.',
                inline: false,
            });
        }

        embed
            .setFooter({ text: 'Nexus Leveling System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
