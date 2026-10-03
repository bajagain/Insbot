import { Client, GatewayIntentBits, Events, type Interaction } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { handleChatInput } from "./handlers/interactionHandler.js";
import { handleButton } from "./handlers/buttonHandler.js";

export function createClient(): Client {
  // Insbit needs no privileged intents: it only responds to slash
  // commands and component interactions.
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  });
}

export function registerEvents(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    logger.info({ tag: c.user.tag, id: c.user.id }, "Insbit is online");
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleChatInput(interaction);
        return;
      }
      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }
    } catch (err) {
      logger.error({ err, type: interaction.type }, "Unhandled interaction error");
    }
  });

  client.on(Events.Error, (err) => logger.error({ err }, "Discord client error"));
  client.on(Events.Warn, (msg) => logger.warn({ msg }, "Discord client warning"));
}

export async function startBot(): Promise<void> {
  const client = createClient();
  registerEvents(client);
  await client.login(env.DISCORD_TOKEN);
}
