import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpArticle } from "../../_components/help";
import { getHelpArticle, helpNavigation } from "../../_content/help";

export function generateStaticParams() {
  return helpNavigation.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const article = getHelpArticle(params.slug);

  if (!article) {
    return {
      title: "Help | ShipWright"
    };
  }

  return {
    title: `${article.title} | ShipWright Help`,
    description: article.description
  };
}

export default async function HelpArticlePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const article = getHelpArticle(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="help-shell">
      <HelpArticle article={article} />
    </main>
  );
}
