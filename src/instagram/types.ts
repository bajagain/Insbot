export type MediaType = "image" | "video" | "carousel" | "unknown";

export interface InstagramProfile {
  username: string;
  displayName?: string;
  biography?: string;
  profilePictureUrl?: string;

  followers?: number;
  following?: number;
  postsCount?: number;

  verified?: boolean;
  category?: string;
  website?: string;

  profileUrl: string;
  retrievedAt: string;
}

export interface InstagramPost {
  id: string;
  mediaType: MediaType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink?: string;
  publishedAt?: string;
  retrievedAt: string;
}

export interface InstagramFollowingUser {
  username: string;
  displayName?: string;
  biography?: string;
  profilePictureUrl?: string;
  profileUrl: string;
}

export interface InstagramProfileResult {
  profile: InstagramProfile;
  private: boolean;
}

export interface InstagramPostsResult {
  posts: InstagramPost[];
  cursor?: string;
  hasMore: boolean;
}

export interface InstagramFollowingResult {
  users: InstagramFollowingUser[];
  cursor?: string;
  hasMore: boolean;
}

export interface InstagramProvider {
  readonly name: string;
  getProfile(username: string): Promise<InstagramProfileResult>;
  getPosts(username: string, cursor?: string): Promise<InstagramPostsResult>;
  getFollowing(username: string, cursor?: string): Promise<InstagramFollowingResult>;
}
