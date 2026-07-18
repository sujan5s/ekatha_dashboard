"use client";

import PageHeader from "@/components/shell/PageHeader";
import ResourceManager from "@/components/resource/ResourceManager";
import type { ResourceConfig } from "@/components/resource/types";
import type { GalleryImage } from "@/lib/types";

const config: ResourceConfig<GalleryImage> = {
  endpoint: "gallery",
  title: "Gallery",
  singular: "Image",
  reorderable: true,
  fields: [
    { name: "imageUrl", label: "Image", type: "image", imageKeyField: "imageKey" },
    { name: "caption", label: "Caption", type: "text", placeholder: "Health camp · Mangaluru" },
    {
      name: "span",
      label: "Tile size",
      type: "select",
      options: [
        { label: "Normal", value: "NORMAL" },
        { label: "Tall (2 rows)", value: "TALL" },
        { label: "Wide (2 columns)", value: "WIDE" },
      ],
    },
  ],
  defaults: { imageUrl: "", imageKey: "", caption: "", span: "NORMAL" },
  thumbnail: (i) => i.imageUrl,
  renderPrimary: (i) => i.caption || "(no caption)",
  renderSecondary: (i) => i.span,
};

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Gallery" subtitle="Community photos in the masonry grid." />
      <ResourceManager config={config} />
    </>
  );
}
