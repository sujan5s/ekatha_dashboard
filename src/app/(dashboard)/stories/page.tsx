"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import type { ResourceConfig } from "@/components/resource/types";
import type { Testimonial } from "@/lib/types";

const config: ResourceConfig<Testimonial> = {
  endpoint: "stories",
  title: "Stories",
  singular: "Story",
  reorderable: true,
  toggleField: "published",
  toggleLabels: { on: "Published", off: "Draft" },
  fields: [
    { name: "text", label: "Quote", type: "textarea" },
    { name: "name", label: "Name", type: "text" },
    { name: "location", label: "Location", type: "text", placeholder: "Mangaluru" },
    { name: "avatarUrl", label: "Avatar", type: "image", imageKeyField: "avatarKey", maxEdge: 400 },
  ],
  defaults: { text: "", name: "", location: "", avatarUrl: "", avatarKey: "", published: true },
  thumbnail: (i) => i.avatarUrl,
  renderPrimary: (i) => i.name,
  renderSecondary: (i) => i.text,
};

export default function StoriesPage() {
  return (
    <>
      <PageHeader title="Stories" subtitle="Testimonials in the “Lives we’ve touched” section." />
      <ResourceManager config={config} />
    </>
  );
}
