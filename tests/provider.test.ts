import { describe, expect, it, vi, afterEach } from "vitest";
import { DoscoProvider } from "../src/instagram/providers/doscoProvider.js";
import {
  PrivateProfileError,
  ProfileNotFoundError,
  ProviderRateLimitError,
  ProviderUnavailableError,
  DataUnavailableError,
} from "../src/utils/errors.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const provider = new DoscoProvider({ baseUrl: "https://api.dosco.test" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DoscoProvider.getProfile", () => {
  it("maps a valid profile payload", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        username: "NASA",
        displayName: "NASA",
        biography: "Explore the universe",
        followers: 12400,
        following: 321,
        postsCount: 45,
        verified: true,
        website: "https://nasa.gov",
      }),
    );

    const { profile } = await provider.getProfile("@nasa");
    expect(profile.username).toBe("nasa");
    expect(profile.followers).toBe(12400);
    expect(profile.verified).toBe(true);
    expect(profile.profileUrl).toBe("https://www.instagram.com/nasa/");
  });

  it("handles missing optional fields", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { username: "nasa" }));
    const { profile } = await provider.getProfile("nasa");
    expect(profile.displayName).toBeUndefined();
    expect(profile.followers).toBeUndefined();
    expect(profile.verified).toBe(false);
  });

  it("raises PrivateProfileError for private profiles", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { username: "nasa", isPrivate: true }));
    await expect(provider.getProfile("nasa")).rejects.toBeInstanceOf(PrivateProfileError);
  });

  it("raises ProfileNotFoundError on 404", async () => {
    vi.stubGlobal("fetch", mockFetch(404, {}));
    await expect(provider.getProfile("nasa")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });

  it("raises ProviderRateLimitError on 429", async () => {
    vi.stubGlobal("fetch", mockFetch(429, {}));
    await expect(provider.getProfile("nasa")).rejects.toBeInstanceOf(ProviderRateLimitError);
  });

  it("raises ProviderUnavailableError on 500", async () => {
    vi.stubGlobal("fetch", mockFetch(500, {}));
    await expect(provider.getProfile("nasa")).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("raises DataUnavailableError on malformed payload", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { unexpected: true }));
    await expect(provider.getProfile("nasa")).rejects.toBeInstanceOf(DataUnavailableError);
  });
});

describe("DoscoProvider.getPosts / getFollowing", () => {
  it("maps posts", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        posts: [{ id: 1, mediaType: "video", caption: "hi", permalink: "https://ig/p/1" }],
      }),
    );
    const result = await provider.getPosts("nasa");
    expect(result.posts[0]?.mediaType).toBe("video");
    expect(result.posts[0]?.id).toBe("1");
  });

  it("maps following users", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { users: [{ username: "Person1", displayName: "Person One" }] }),
    );
    const result = await provider.getFollowing("nasa");
    expect(result.users[0]?.username).toBe("person1");
    expect(result.users[0]?.profileUrl).toBe("https://www.instagram.com/person1/");
  });
});

describe("DoscoProvider auth", () => {
  it("sends no auth header when no key is configured", async () => {
    const fetchMock = mockFetch(200, { username: "nasa" });
    vi.stubGlobal("fetch", fetchMock);
    await provider.getProfile("nasa");
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("sends the key as a bearer header when configured", async () => {
    const fetchMock = mockFetch(200, { username: "nasa" });
    vi.stubGlobal("fetch", fetchMock);
    const withKey = new DoscoProvider({ baseUrl: "https://api.dosco.test", apiKey: "secret" });
    await withKey.getProfile("nasa");
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
  });

  it("sends the key as a query parameter when configured", async () => {
    const fetchMock = mockFetch(200, { username: "nasa" });
    vi.stubGlobal("fetch", fetchMock);
    const withQueryKey = new DoscoProvider({
      baseUrl: "https://api.dosco.test",
      apiKey: "secret",
      keyQueryParam: "key",
    });
    await withQueryKey.getProfile("nasa");
    const url = fetchMock.mock.calls[0]![0] as URL;
    expect(url.searchParams.get("key")).toBe("secret");
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
