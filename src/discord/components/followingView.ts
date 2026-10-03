import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIEmbed,
} from "discord.js";
import type { InstagramFollowingUser } from "../../instagram/types.js";
import { ids } from "../customIds.js";
import { paginate } from "../../utils/pagination.js";
import { EMBED_DESCRIPTION_LIMIT, orNotAvailable, truncate } from "../format.js";

const BRAND = 0xe1306c;

export interface FollowingViewOptions {
  username: string;
  users: InstagramFollowingUser[];
  page: number;
  pageSize: number;
  sessionId: string;
}

function formatEntry(user: InstagramFollowingUser): string {
  const name = orNotAvailable(user.displayName);
  const bio = user.biography?.trim();
  const lines = [
    `**👤 [@${user.username}](${user.profileUrl})**`,
    `> ${truncate(name, 120)}`,
  ];
  if (bio) lines.push(`> _${truncate(bio, 160)}_`);
  return lines.join("\n");
}

export function buildFollowingView(options: FollowingViewOptions): {
  embeds: [APIEmbed];
  components: [ActionRowBuilder<ButtonBuilder>];
} {
  const pageSize = Math.min(Math.max(1, options.pageSize), 10);
  const page = paginate(options.users, options.page, pageSize);

  const description =
    page.totalItems === 0
      ? "No public following information is available from the configured data source."
      : page.items.map(formatEntry).join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: `@${options.username} — Following` })
    .setDescription(truncate(description, EMBED_DESCRIPTION_LIMIT))
    .setFooter({
      text: `Page ${page.page}/${page.totalPages} · ${page.totalItems} accounts · public data only`,
    });

  return {
    embeds: [embed.toJSON()],
    components: [
      buildFollowingButtons(
        options.sessionId,
        page.page,
        page.totalPages,
        page.hasPrevious,
        page.hasNext,
      ),
    ],
  };
}

export function buildFollowingButtons(
  sessionId: string,
  page: number,
  totalPages: number,
  hasPrevious: boolean,
  hasNext: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.followingPrev(sessionId))
      .setLabel("Previous")
      .setEmoji("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasPrevious),
    new ButtonBuilder()
      .setCustomId(ids.pageIndicator(sessionId))
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(ids.followingNext(sessionId))
      .setLabel("Next")
      .setEmoji("▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasNext),
    new ButtonBuilder()
      .setCustomId(ids.profile(sessionId))
      .setLabel("Profile")
      .setEmoji("🔙")
      .setStyle(ButtonStyle.Primary),
  );
}
