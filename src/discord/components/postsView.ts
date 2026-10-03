import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIEmbed,
} from "discord.js";
import type { InstagramPost } from "../../instagram/types.js";
import { ids } from "../customIds.js";
import { paginate } from "../../utils/pagination.js";
import { EMBED_DESCRIPTION_LIMIT, formatDate, truncate } from "../format.js";

const BRAND = 0xe1306c;

export interface PostsViewOptions {
  username: string;
  posts: InstagramPost[];
  page: number;
  pageSize: number;
  sessionId: string;
}

const MEDIA_LABEL: Record<InstagramPost["mediaType"], string> = {
  image: "🖼️ Image",
  video: "🎬 Video",
  carousel: "🎠 Carousel",
  unknown: "❔ Media",
};

/** Render a single post as an embed. Uses the post's public image when present. */
export function buildPostEmbed(post: InstagramPost, index: number, total: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: `Post ${index} of ${total}` })
    .addFields({ name: "Type", value: MEDIA_LABEL[post.mediaType], inline: true });

  if (post.publishedAt) {
    embed.addFields({ name: "Published", value: formatDate(post.publishedAt), inline: true });
  }

  const caption = post.caption?.trim();
  embed.setDescription(
    truncate(caption && caption.length > 0 ? caption : "No caption", EMBED_DESCRIPTION_LIMIT),
  );

  if (post.permalink) embed.setURL(post.permalink);

  const image = post.thumbnailUrl ?? (post.mediaType === "image" ? post.mediaUrl : undefined);
  if (image) embed.setImage(image);

  return embed;
}

/**
 * The posts view is a header embed plus up to `pageSize` post embeds.
 * Discord allows 10 embeds per message, so we clamp accordingly.
 */
export function buildPostsView(options: PostsViewOptions): {
  embeds: APIEmbed[];
  components: [ActionRowBuilder<ButtonBuilder>];
} {
  const pageSize = Math.min(Math.max(1, options.pageSize), 9);
  const page = paginate(options.posts, options.page, pageSize);

  const header = new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: `@${options.username} — Posts` })
    .setDescription(
      page.totalItems === 0
        ? "No public posts are available from the configured data source."
        : `Showing **${page.items.length}** of **${page.totalItems}** posts · Page **${page.page}/${page.totalPages}**`,
    );

  const embeds: APIEmbed[] = [header.toJSON()];
  page.items.forEach((post, i) => {
    embeds.push(
      buildPostEmbed(post, (page.page - 1) * pageSize + i + 1, page.totalItems).toJSON(),
    );
  });

  return { embeds, components: [buildPostsButtons(options.sessionId, page.page, page.totalPages, page.hasPrevious, page.hasNext)] };
}

export function buildPostsButtons(
  sessionId: string,
  page: number,
  totalPages: number,
  hasPrevious: boolean,
  hasNext: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.postsPrev(sessionId))
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
      .setCustomId(ids.postsNext(sessionId))
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
