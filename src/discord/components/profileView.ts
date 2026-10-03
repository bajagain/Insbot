import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIEmbed,
} from "discord.js";
import type { InstagramProfile } from "../../instagram/types.js";
import { ids } from "../customIds.js";
import {
  EMBED_FIELD_VALUE_LIMIT,
  formatCount,
  formatNumber,
  orNotAvailable,
  truncate,
} from "../format.js";

const BRAND = 0xe1306c; // Instagram gradient pink

export interface ProfileViewOptions {
  profile: InstagramProfile;
  sessionId: string;
  source: "cache" | "storage" | "provider";
}

function sourceLabel(source: ProfileViewOptions["source"]): string {
  switch (source) {
    case "cache":
      return "cached";
    case "storage":
      return "saved";
    default:
      return "live";
  }
}

/** Build the polished profile embed. */
export function buildProfileEmbed({ profile, source }: ProfileViewOptions): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: "Insbit · Instagram Profile" })
    .setTitle(`${profile.displayName ?? profile.username}${profile.verified ? " ✔️" : ""}`)
    .setURL(profile.profileUrl)
    .addFields(
      { name: "Username", value: `\`@${profile.username}\``, inline: true },
      { name: "Followers", value: formatCount(profile.followers), inline: true },
      { name: "Following", value: formatCount(profile.following), inline: true },
      { name: "Posts", value: formatNumber(profile.postsCount), inline: true },
      { name: "Verified", value: profile.verified ? "Yes" : "No", inline: true },
      { name: "Category", value: orNotAvailable(profile.category), inline: true },
    );

  const bio = profile.biography?.trim();
  embed.addFields({
    name: "Bio",
    value: truncate(bio && bio.length > 0 ? bio : "Not available", EMBED_FIELD_VALUE_LIMIT),
  });

  if (profile.website) {
    embed.addFields({
      name: "Website",
      value: truncate(profile.website, EMBED_FIELD_VALUE_LIMIT),
    });
  }

  embed.setFooter({
    text: `Insbit · ${sourceLabel(source)} · retrieved ${new Date(
      profile.retrievedAt,
    ).toLocaleString("en-US")}`,
  });

  if (profile.profilePictureUrl) {
    embed.setThumbnail(profile.profilePictureUrl);
  }

  return embed;
}

/** Primary navigation row: posts, following, open, refresh. */
export function buildProfileButtons(sessionId: string, profileUrl: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.openPosts(sessionId))
      .setLabel("View All Posts")
      .setEmoji("📷")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ids.openFollowing(sessionId))
      .setLabel("View Following")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel("Open Instagram")
      .setEmoji("🔗")
      .setStyle(ButtonStyle.Link)
      .setURL(profileUrl),
    new ButtonBuilder()
      .setCustomId(ids.refresh(sessionId))
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildProfileView(
  options: ProfileViewOptions,
): { embeds: [APIEmbed]; components: [ActionRowBuilder<ButtonBuilder>] } {
  return {
    embeds: [buildProfileEmbed(options).toJSON()],
    components: [buildProfileButtons(options.sessionId, options.profile.profileUrl)],
  };
}
