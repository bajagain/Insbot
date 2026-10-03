import { describe, expect, it } from "vitest";
import {
  isValidUsername,
  normalizeUsername,
  profileUrlFor,
} from "../src/instagram/validator.js";
import { InvalidUsernameError } from "../src/utils/errors.js";

describe("normalizeUsername", () => {
  it("normalizes @ prefixes and case", () => {
    expect(normalizeUsername("@NASA")).toBe("nasa");
    expect(normalizeUsername("nasa")).toBe("nasa");
    expect(normalizeUsername("  @nasa  ")).toBe("nasa");
  });

  it("allows periods and underscores", () => {
    expect(normalizeUsername("john.doe_1")).toBe("john.doe_1");
  });

  it("rejects invalid characters and empties", () => {
    expect(() => normalizeUsername("bad name")).toThrow(InvalidUsernameError);
    expect(() => normalizeUsername("")).toThrow(InvalidUsernameError);
    expect(() => normalizeUsername("@")).toThrow(InvalidUsernameError);
    expect(() => normalizeUsername("a".repeat(31))).toThrow(InvalidUsernameError);
  });

  it("validates without throwing", () => {
    expect(isValidUsername("nasa")).toBe(true);
    expect(isValidUsername("no way")).toBe(false);
  });
});

describe("profileUrlFor", () => {
  it("builds a safe public URL", () => {
    expect(profileUrlFor("@NASA")).toBe("https://www.instagram.com/nasa/");
  });
});
