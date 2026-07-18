"use client";

import PageHeader from "@/components/shell/PageHeader";
import HomeTextEditor from "@/components/HomeTextEditor";

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About"
        subtitle="The two photos shown in the “About Team Ekata” section."
      />
      <HomeTextEditor
        endpoint="about"
        fields={[
          {
            name: "aboutImageUrl",
            label: "Main image (large)",
            type: "image",
            imageKeyField: "aboutImageKey",
          },
          {
            name: "aboutImage2Url",
            label: "Inset image (small, bottom-left)",
            type: "image",
            imageKeyField: "aboutImage2Key",
          },
        ]}
      />
    </>
  );
}
