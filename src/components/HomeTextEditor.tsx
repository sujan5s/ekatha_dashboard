"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import ImageUpload from "@/components/ui/ImageUpload";
import type { HomeText } from "@/lib/types";

type FieldType = "text" | "textarea" | "image";
interface TextField {
  name: keyof HomeText;
  label: string;
  type: FieldType;
  imageKeyField?: keyof HomeText;
  placeholder?: string;
}

/** Edits a subset of the singleton HomeText row and PATCHes to `endpoint`. */
export default function HomeTextEditor({
  endpoint,
  fields,
}: {
  endpoint: string;
  fields: TextField[];
}) {
  const toast = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const text = await api<HomeText>("/api/home-text");
        const initial: Record<string, unknown> = {};
        for (const f of fields) {
          initial[f.name] = text[f.name] ?? "";
          if (f.imageKeyField) initial[f.imageKeyField] = text[f.imageKeyField] ?? "";
        }
        setForm(initial);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load text");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/${endpoint}`, { method: "PATCH", body: form });
      toast.success("Text saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white/60" />;
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={String(f.name)} className={f.type !== "text" ? "sm:col-span-2" : ""}>
            {f.type === "image" ? (
              <Field label={f.label}>
                <ImageUpload
                  url={String(form[f.name] ?? "")}
                  onChange={(res) =>
                    setForm((s) => ({
                      ...s,
                      [f.name]: res.url,
                      ...(f.imageKeyField ? { [f.imageKeyField]: res.key } : {}),
                    }))
                  }
                />
              </Field>
            ) : f.type === "textarea" ? (
              <Field label={f.label}>
                <TextArea
                  rows={3}
                  value={String(form[f.name] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                />
              </Field>
            ) : (
              <Field label={f.label}>
                <TextInput
                  value={String(form[f.name] ?? "")}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                />
              </Field>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Button loading={saving} onClick={save}>
          Save text
        </Button>
      </div>
    </div>
  );
}
