import { REST, Routes } from "discord.js";
import { env } from "../config/env.js";
import { commandDefinitions } from "../discord/commands/instagram.js";
import { logger } from "../utils/logger.js";

/**
 * Register Insbit's slash commands.
 *   - With DISCORD_GUILD_ID set, registers to that guild (instant).
 *   - Otherwise registers globally (can take up to an hour to appear).
 */
async function register(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  const route = env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
    : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

  const data = (await rest.put(route, { body: commandDefinitions })) as unknown[];
  logger.info(
    { count: data.length, scope: env.DISCORD_GUILD_ID ? "guild" : "global" },
    "Registered slash commands",
  );
}

register().catch((err) => {
  logger.fatal({ err }, "Failed to register commands");
  process.exit(1);
});
