"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import HomeTextEditor from "@/components/HomeTextEditor";
import type { ResourceConfig } from "@/components/resource/types";
import type { ImpactBar } from "@/lib/types";

const barConfig: ResourceConfig<ImpactBar> = {
  endpoint: "impact",
  title: "Impact bars",
  singular: "Bar",
  reorderable: true,
  fields: [
    { name: "label", label: "Label", type: "text", placeholder: "Surgery & Hospitalization" },
    { name: "percent", label: "Percent", type: "number", hint: "0–100" },
    { name: "colorFrom", label: "Gradient from", type: "color" },
    { name: "colorTo", label: "Gradient to", type: "color" },
  ],
  defaults: { label: "", percent: 0, colorFrom: "#E85D04", colorTo: "#D4A017" },
  renderPrimary: (i) => i.label,
  renderSecondary: (i) => `${i.percent}%`,
};

export default function ImpactPage() {
  return (
    <>
      <PageHeader
        title="Impact"
        subtitle="The allocation bars and the quote card in “Where every rupee goes”."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Allocation bars
        </h2>
        <ResourceManager
          config={barConfig}
          banner={(items) => {
            const sum = items.reduce((acc, b) => acc + (b.percent || 0), 0);
            if (sum === 100) return null;
            return (
              <div className="mb-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-[#8a6d10]">
                Heads up: the bars add up to {sum}%, not 100%.
              </div>
            );
          }}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Quote card
        </h2>
        <HomeTextEditor
          endpoint="impact-quote"
          fields={[
            { name: "quoteText", label: "Quote", type: "textarea" },
            { name: "quoteAttribution", label: "Attribution", type: "text" },
            {
              name: "quoteImageUrl",
              label: "Quote image",
              type: "image",
              imageKeyField: "quoteImageKey",
            },
          ]}
        />
      </section>
    </>
  );
}
