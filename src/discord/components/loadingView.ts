import { EmbedBuilder, type APIEmbed } from "discord.js";

const BRAND = 0xe1306c;

export function buildLoadingEmbed(username: string): APIEmbed {
  return new EmbedBuilder()
    .setColor(BRAND)
    .setDescription(`🔎 Looking up **@${username}**…`)
    .toJSON();
}

export function buildLoadingView(username: string): { embeds: [APIEmbed] } {
  return { embeds: [buildLoadingEmbed(username)] };
}
