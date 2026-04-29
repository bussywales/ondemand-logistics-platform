import { describe, expect, it } from "vitest";
import { getHelpArticle, helpArticles, helpNavigation } from "./help";

describe("help content", () => {
  it("has an article for every help navigation item", () => {
    for (const item of helpNavigation) {
      expect(getHelpArticle(item.slug)).not.toBeNull();
      expect(item.href).toBe(`/help/${item.slug}`);
    }
  });

  it("keeps articles practical and operational", () => {
    for (const article of Object.values(helpArticles)) {
      expect(article.whatThisScreenDoes.length).toBeGreaterThan(0);
      expect(article.whatToDoNext.length).toBeGreaterThan(0);
      expect(article.operatorActions.length).toBeGreaterThan(0);
      expect(article.commonProblems.length).toBeGreaterThan(0);
      expect(article.description).not.toMatch(/coming soon|fully automated|guaranteed/i);
    }
  });

  it("returns null for unknown help slugs", () => {
    expect(getHelpArticle("unknown-topic")).toBeNull();
  });
});
