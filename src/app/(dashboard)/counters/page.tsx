"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import type { ResourceConfig } from "@/components/resource/types";
import type { StatCounter } from "@/lib/types";

const config: ResourceConfig<StatCounter> = {
  endpoint: "counters",
  title: "Counters",
  singular: "Counter",
  reorderable: true,
  fields: [
    { name: "icon", label: "Icon (emoji)", type: "emoji" },
    { name: "value", label: "Value", type: "number", hint: "The number that counts up." },
    { name: "suffix", label: "Suffix", type: "text", placeholder: "+, L+, yrs" },
    { name: "label", label: "Label", type: "text", placeholder: "Families Helped" },
  ],
  defaults: { icon: "✨", value: 0, suffix: "+", label: "" },
  renderPrimary: (i) => `${i.icon}  ${i.value}${i.suffix}`,
  renderSecondary: (i) => i.label,
};

export default function CountersPage() {
  return (
    <>
      <PageHeader title="Counters" subtitle="The animated stats shown beneath the hero." />
      <ResourceManager config={config} />
    </>
  );
}
