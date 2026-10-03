import { describe, expect, it } from "vitest";
import { buildProfileView } from "../src/discord/components/profileView.js";
import { buildPostsView } from "../src/discord/components/postsView.js";
import { buildFollowingView } from "../src/discord/components/followingView.js";
import { buildErrorView } from "../src/discord/components/errorView.js";
import { ProfileNotFoundError } from "../src/utils/errors.js";
import type {
  InstagramFollowingUser,
  InstagramPost,
  InstagramProfile,
} from "../src/instagram/types.js";

const profile: InstagramProfile = {
  username: "nasa",
  displayName: "NASA",
  biography: "Explore the universe 🚀",
  profilePictureUrl: "https://example.test/pic.jpg",
  followers: 12400,
  following: 321,
  postsCount: 45,
  verified: true,
  category: "Government Organization",
  website: "https://nasa.gov",
  profileUrl: "https://www.instagram.com/nasa/",
  retrievedAt: new Date().toISOString(),
};

describe("profile view", () => {
  it("builds a valid embed and button row", () => {
    const view = buildProfileView({ profile, sessionId: "abc", source: "provider" });
    expect(view.embeds).toHaveLength(1);
    const embed = view.embeds[0]!;
    expect(embed.title).toContain("NASA");
    expect(embed.thumbnail?.url).toBe(profile.profilePictureUrl);
    expect(embed.url).toBe(profile.profileUrl);

    const buttons = view.components[0]!.toJSON().components;
    expect(buttons).toHaveLength(4);
    // Link button points at the public profile.
    expect(buttons[2]).toMatchObject({
      style: 5,
      url: "https://www.instagram.com/nasa/",
    });
    // Custom IDs stay compact and non-sensitive.
    expect(buttons[0]).toMatchObject({ custom_id: "insbit:posts:abc:open" });
    expect(buttons[3]).toMatchObject({ custom_id: "insbit:refresh:abc" });
  });

  it("renders 'Not available' for missing fields", () => {
    const view = buildProfileView({
      profile: { username: "x", profileUrl: "https://www.instagram.com/x/", retrievedAt: new Date().toISOString() },
      sessionId: "abc",
      source: "storage",
    });
    const fields = view.embeds[0]!.fields ?? [];
    const bio = fields.find((f) => f.name === "Bio");
    expect(bio?.value).toBe("Not available");
  });
});

describe("posts view", () => {
  const posts: InstagramPost[] = Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    mediaType: "image",
    caption: `Caption ${i + 1}`,
    permalink: `https://instagram.com/p/${i + 1}`,
    mediaUrl: `https://example.test/${i + 1}.jpg`,
    retrievedAt: new Date().toISOString(),
  }));

  it("paginates with a header plus per-post embeds", () => {
    const view = buildPostsView({ username: "nasa", posts, page: 1, pageSize: 5, sessionId: "abc" });
    // 1 header + 5 posts
    expect(view.embeds).toHaveLength(6);
    expect(view.embeds[0]!.description).toContain("Page **1/3**");
    const buttons = view.components[0]!.toJSON().components;
    expect(buttons[0]!.disabled).toBe(true); // previous disabled on first page
    expect(buttons[2]!.disabled).toBeFalsy(); // next enabled
  });

  it("disables next on the last page", () => {
    const view = buildPostsView({ username: "nasa", posts, page: 3, pageSize: 5, sessionId: "abc" });
    const buttons = view.components[0]!.toJSON().components;
    expect(buttons[0]!.disabled).toBeFalsy();
    expect(buttons[2]!.disabled).toBe(true);
  });

  it("handles an empty post list", () => {
    const view = buildPostsView({ username: "nasa", posts: [], page: 1, pageSize: 5, sessionId: "abc" });
    expect(view.embeds).toHaveLength(1);
    expect(view.embeds[0]!.description).toContain("No public posts");
  });
});

describe("following view", () => {
  const users: InstagramFollowingUser[] = Array.from({ length: 25 }, (_, i) => ({
    username: `person${i + 1}`,
    displayName: `Person ${i + 1}`,
    biography: "Photographer & creator",
    profileUrl: `https://www.instagram.com/person${i + 1}/`,
  }));

  it("shows 10 per page with navigation", () => {
    const view = buildFollowingView({ username: "nasa", users, page: 2, pageSize: 10, sessionId: "abc" });
    expect(view.embeds[0]!.description).toContain("@person11");
    expect(view.embeds[0]!.description).toContain("@person20");
    expect(view.embeds[0]!.footer?.text).toContain("Page 2/3");
  });
});

describe("error view", () => {
  it("maps domain errors to a friendly embed", () => {
    const view = buildErrorView(new ProfileNotFoundError("nasa"));
    expect(view.embeds[0]!.title).toBe("❌ Profile not found");
    expect(view.embeds[0]!.description).toContain("@nasa");
    expect(view.components).toHaveLength(0);
  });

  it("sanitizes unknown errors", () => {
    const view = buildErrorView(new Error("secret internal detail"));
    expect(JSON.stringify(view.embeds[0])).not.toContain("secret internal detail");
  });
});
