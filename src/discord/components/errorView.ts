import { EmbedBuilder, type APIEmbed } from "discord.js";
import { isInsbitError } from "../../utils/errors.js";

const ERROR_COLOR = 0xed4245;

const TITLES: Record<string, string> = {
  INVALID_USERNAME: "❌ Invalid username",
  PROFILE_NOT_FOUND: "❌ Profile not found",
  PRIVATE_PROFILE: "🔒 Private Profile",
  PROVIDER_UNAVAILABLE: "⚠️ Data temporarily unavailable",
  PROVIDER_RATE_LIMIT: "⏳ Rate limited",
  DATA_UNAVAILABLE: "📭 Not available",
  SESSION_EXPIRED: "⌛ Session expired",
  UNAUTHORIZED_SESSION: "🔒 Not your session",
  RATE_LIMITED: "⏳ Slow down",
};

/**
 * Turn any thrown value into a friendly embed. Raw error details are
 * logged elsewhere and never leaked into Discord.
 */
export function buildErrorEmbed(err: unknown): APIEmbed {
  const code = isInsbitError(err) ? err.code : "UNKNOWN";
  const title = TITLES[code] ?? "⚠️ Something went wrong";
  const description = isInsbitError(err)
    ? err.userMessage
    : "Insbit couldn't complete that request. Please try again later.";

  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setAuthor({ name: "Insbit" })
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "Insbit · public data only" })
    .toJSON();
}

export function buildErrorView(err: unknown): { embeds: [APIEmbed]; components: [] } {
  return { embeds: [buildErrorEmbed(err)], components: [] };
}
