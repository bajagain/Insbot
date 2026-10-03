import type { ActionRowBuilder, APIEmbed, ButtonBuilder } from "discord.js";
import { buildProfileEmbed, buildProfileButtons } from "./components/profileView.js";
import { buildPostsView } from "./components/postsView.js";
import { buildFollowingView } from "./components/followingView.js";
import { getProfile } from "../services/profileService.js";
import { getPosts } from "../services/postsService.js";
import { getFollowing } from "../services/followingService.js";
import { getSettings } from "../storage/settingsStore.js";
import { clampPage } from "../utils/pagination.js";

export interface ViewPayload {
  embeds: APIEmbed[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

/** Render the profile view for a session, resolving the profile first. */
export async function renderProfileView(
  username: string,
  sessionId: string,
): Promise<ViewPayload> {
  const { profile, source } = await getProfile(username);
  return {
    embeds: [buildProfileEmbed({ profile, sessionId, source }).toJSON()],
    components: [buildProfileButtons(sessionId, profile.profileUrl)],
  };
}

/** Render the paginated posts view for a session. */
export async function renderPostsView(
  username: string,
  sessionId: string,
  page: number,
): Promise<ViewPayload> {
  const [posts, settings] = await Promise.all([getPosts(username), getSettings()]);
  const view = buildPostsView({
    username,
    posts,
    page: clampPage(page, posts.length, settings.postsPerPage),
    pageSize: settings.postsPerPage,
    sessionId,
  });
  return { embeds: view.embeds, components: view.components };
}

/** Render the paginated following view for a session. */
export async function renderFollowingView(
  username: string,
  sessionId: string,
  page: number,
): Promise<ViewPayload> {
  const [users, settings] = await Promise.all([getFollowing(username), getSettings()]);
  const view = buildFollowingView({
    username,
    users,
    page: clampPage(page, users.length, settings.followingPerPage),
    pageSize: settings.followingPerPage,
    sessionId,
  });
  return { embeds: view.embeds, components: view.components };
}
