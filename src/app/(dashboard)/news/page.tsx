"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import HomeTextEditor from "@/components/HomeTextEditor";
import type { ResourceConfig } from "@/components/resource/types";
import type { NewsArticle } from "@/lib/types";

const newsConfig: ResourceConfig<NewsArticle> = {
  endpoint: "news",
  title: "Media Coverage Articles",
  singular: "Article",
  reorderable: true,
  fields: [
    { name: "imageUrl", label: "Image", type: "image", imageKeyField: "imageKey" },
    { name: "title", label: "Title", type: "text", placeholder: "e.g. Times of India Feature" },
    { name: "date", label: "Date (ISO or YYYY-MM-DD)", type: "text", placeholder: "e.g. 2024-05-15" },
  ],
  defaults: { imageUrl: "", imageKey: "", title: "", date: new Date().toISOString() },
  thumbnail: (i) => i.imageUrl,
  renderPrimary: (i) => i.title || "(no title)",
  renderSecondary: (i) => (i.date ? new Date(i.date).toLocaleDateString() : "No date"),
};

export default function NewsPage() {
  return (
    <>
      <PageHeader
        title="Media Coverage"
        subtitle="Manage newspaper images and page texts."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Section Texts
        </h2>
        <HomeTextEditor
          endpoint="news-text"
          fields={[
            { name: "newsBadge", label: "Badge", type: "text" },
            { name: "newsHeading", label: "Heading", type: "text" },
            { name: "newsSub", label: "Subtitle", type: "textarea" },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          News Articles
        </h2>
        <ResourceManager config={newsConfig} />
      </section>
    </>
  );
}
