"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import type { ResourceConfig } from "@/components/resource/types";
import type { Faq } from "@/lib/types";

const config: ResourceConfig<Faq> = {
  endpoint: "faq",
  title: "FAQ",
  singular: "Question",
  reorderable: true,
  toggleField: "published",
  toggleLabels: { on: "Published", off: "Draft" },
  fields: [
    { name: "question", label: "Question", type: "text" },
    { name: "answer", label: "Answer", type: "textarea" },
  ],
  defaults: { question: "", answer: "", published: true },
  renderPrimary: (i) => i.question,
  renderSecondary: (i) => i.answer,
};

export default function FaqPage() {
  return (
    <>
      <PageHeader title="FAQ" subtitle="Frequently asked questions accordion." />
      <ResourceManager config={config} />
    </>
  );
}
