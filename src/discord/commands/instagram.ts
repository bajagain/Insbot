import { SlashCommandBuilder } from "discord.js";

export const INSTAGRAM_COMMAND_NAME = "instagram";

export const instagramCommand = new SlashCommandBuilder()
  .setName(INSTAGRAM_COMMAND_NAME)
  .setDescription("Look up public Instagram profile information")
  .addStringOption((option) =>
    option
      .setName("username")
      .setDescription("Instagram username, with or without the @ (e.g. nasa)")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(30),
  );

export const commandDefinitions = [instagramCommand.toJSON()];