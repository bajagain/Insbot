import type { ChatInputCommandInteraction } from "discord.js";
import { INSTAGRAM_COMMAND_NAME } from "../commands/instagram.js";
import { normalizeUsername } from "../../instagram/validator.js";
import { buildLoadingEmbed } from "../components/loadingView.js";
import { buildErrorView } from "../components/errorView.js";
import { renderProfileView } from "../views.js";
import { createSession } from "../../security/sessionSecurity.js";
import { userRateLimiter } from "../../security/rateLimiter.js";
import { recordProfileView, recordSearch } from "../../storage/statsStore.js";
import { RateLimitError, isInsbitError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle the `/instagram <username>` command:
 *   validate → rate limit → create session → show profile GUI.
 */
export async function handleChatInput(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (interaction.commandName !== INSTAGRAM_COMMAND_NAME) return;

  const gate = userRateLimiter.check(interaction.user.id);
  if (!gate.allowed) {
    await interaction.reply({
      ...buildErrorView(new RateLimitError(gate.retryAfterSeconds)),
      ephemeral: true,
    });
    return;
  }

  const raw = interaction.options.getString("username", true);

  let username: string;
  try {
    username = normalizeUsername(raw);
  } catch (err) {
    await interaction.reply({ ...buildErrorView(err), ephemeral: true });
    return;
  }

  // Show the loading state, then replace it with the profile GUI.
  await interaction.reply({ embeds: [buildLoadingEmbed(username)] });

  try {
    const session = await createSession({
      discordUserId: interaction.user.id,
      username,
    });

    const view = await renderProfileView(username, session.sessionId);
    await interaction.editReply({ embeds: view.embeds, components: view.components });

    await Promise.allSettled([recordSearch(), recordProfileView()]);
  } catch (err) {
    if (!isInsbitError(err)) {
      logger.error({ err, username }, "Failed to handle /instagram");
    }
    await interaction.editReply(buildErrorView(err));
  }
}
