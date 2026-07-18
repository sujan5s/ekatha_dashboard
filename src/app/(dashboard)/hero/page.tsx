"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import HomeTextEditor from "@/components/HomeTextEditor";
import type { ResourceConfig } from "@/components/resource/types";
import type { HeroSlide } from "@/lib/types";

const slideConfig: ResourceConfig<HeroSlide> = {
  endpoint: "hero",
  title: "Hero slides",
  singular: "Slide",
  reorderable: true,
  toggleField: "active",
  toggleLabels: { on: "Active", off: "Hidden" },
  fields: [
    { name: "imageUrl", label: "Background image", type: "image", imageKeyField: "imageKey" },
    { name: "alt", label: "Alt text", type: "text", placeholder: "Describe the image" },
  ],
  defaults: { imageUrl: "", imageKey: "", alt: "", active: true },
  thumbnail: (i) => i.imageUrl,
  renderPrimary: (i) => i.alt || "Hero image",
  renderSecondary: (i) => (i.active ? "Shown in rotation" : "Hidden"),
};

export default function HeroPage() {
  return (
    <>
      <PageHeader
        title="Hero"
        subtitle="Headline text and the rotating background images (change every 5s)."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Hero text
        </h2>
        <HomeTextEditor
          endpoint="hero-text"
          fields={[
            { name: "headline", label: "Headline (line 1)", type: "text" },
            { name: "headlineEm", label: "Headline emphasis (italic)", type: "text" },
            { name: "headlineEnd", label: "Headline (after emphasis)", type: "text" },
            { name: "subText", label: "Sub-text", type: "textarea" },
            { name: "ctaPrimary", label: "Primary button", type: "text" },
            { name: "ctaGhost", label: "Secondary button", type: "text" },
            { name: "trustText", label: "Trust line", type: "text" },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Background images
        </h2>
        <ResourceManager config={slideConfig} />
      </section>
    </>
  );
}
