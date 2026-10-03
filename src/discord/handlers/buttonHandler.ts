import type { ButtonInteraction } from "discord.js";
import { parseCustomId } from "../customIds.js";
import { buildErrorView } from "../components/errorView.js";
import { renderFollowingView, renderPostsView, renderProfileView } from "../views.js";
import { assertSessionOwner, touchSession } from "../../security/sessionSecurity.js";
import { refreshProfile } from "../../services/profileService.js";
import { buildProfileEmbed, buildProfileButtons } from "../components/profileView.js";
import { isInsbitError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

async function showError(interaction: ButtonInteraction, err: unknown): Promise<void> {
  const payload = buildErrorView(err);
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload).catch(() => undefined);
  } else {
    await interaction.reply({ ...payload, ephemeral: true }).catch(() => undefined);
  }
}

/** Route any Insbit button press to the right view. */
export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const action = parseCustomId(interaction.customId);
  if (!action) return;

  try {
    // Every interaction re-verifies ownership and expiry.
    const session = await assertSessionOwner(action.sessionId, interaction.user.id);

    await interaction.deferUpdate();

    switch (action.kind) {
      case "profile": {
        await touchSession(session.sessionId, { view: "profile", page: 1 });
        const view = await renderProfileView(session.username, session.sessionId);
        await interaction.editReply(view);
        return;
      }

      case "posts": {
        const delta = action.direction === "next" ? 1 : action.direction === "prev" ? -1 : 0;
        const target = action.direction === "open" ? 1 : session.page + delta;
        await touchSession(session.sessionId, { view: "posts", page: Math.max(1, target) });
        const view = await renderPostsView(
          session.username,
          session.sessionId,
          Math.max(1, target),
        );
        await interaction.editReply(view);
        return;
      }

      case "following": {
        const delta = action.direction === "next" ? 1 : action.direction === "prev" ? -1 : 0;
        const target = action.direction === "open" ? 1 : session.page + delta;
        await touchSession(session.sessionId, {
          view: "following",
          page: Math.max(1, target),
        });
        const view = await renderFollowingView(
          session.username,
          session.sessionId,
          Math.max(1, target),
        );
        await interaction.editReply(view);
        return;
      }

      case "refresh": {
        const { profile, source } = await refreshProfile(session.username);
        await touchSession(session.sessionId, { view: "profile", page: 1 });
        await interaction.editReply({
          embeds: [buildProfileEmbed({ profile, sessionId: session.sessionId, source }).toJSON()],
          components: [buildProfileButtons(session.sessionId, profile.profileUrl)],
        });
        return;
      }

      default:
        return;
    }
  } catch (err) {
    if (!isInsbitError(err)) {
      logger.error({ err, customId: interaction.customId }, "Button handler failed");
    }
    await showError(interaction, err);
  }
}
