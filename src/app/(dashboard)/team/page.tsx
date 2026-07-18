"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import type { ResourceConfig } from "@/components/resource/types";
import type { TeamMember } from "@/lib/types";

const config: ResourceConfig<TeamMember> = {
  endpoint: "team",
  title: "Team",
  singular: "Member",
  reorderable: true,
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "role", label: "Role", type: "text", placeholder: "President" },
    { name: "photoUrl", label: "Photo", type: "image", imageKeyField: "photoKey", maxEdge: 400 },
    { name: "isLead", label: "Highlight (saffron ring)", type: "boolean", hint: "For President / Vice President." },
  ],
  defaults: { name: "", role: "", photoUrl: "", photoKey: "", isLead: false },
  thumbnail: (i) => i.photoUrl,
  renderPrimary: (i) => i.name,
  renderSecondary: (i) => i.role,
};

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Core Team" subtitle="The committee grid." />
      <ResourceManager config={config} />
    </>
  );
}
