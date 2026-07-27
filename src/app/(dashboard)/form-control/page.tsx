"use client";

import { useState } from "react";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { TextInput, TextareaInput } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export interface FormConfig {
  id: string;
  badgeText: string;
  titleEn: string;
  titleKn: string;
  subTitleEn: string;
  subTitleKn: string;
  guidanceTitleEn: string;
  guidanceTitleKn: string;
  guidanceSubEn: string;
}

export interface FormFieldData {
  id: string;
  fieldKey: string;
  num: number;
  titleEn: string;
  titleKn: string;
  subtitleEn?: string;
  subtitleKn?: string;
  type: "text" | "tel" | "textarea" | "file";
  required: boolean;
  placeholderEn?: string;
  placeholderKn?: string;
  acceptedTypes?: string;
  order: number;
  active: boolean;
}

export default function FormControlPage() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{
    config: FormConfig;
    fields: FormFieldData[];
  }>("/api/form-control", api);

  const [savingConfig, setSavingConfig] = useState(false);

  // Field creation & modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldData | null>(null);

  const [fieldForm, setFieldForm] = useState<Partial<FormFieldData>>({
    fieldKey: "",
    titleEn: "",
    titleKn: "",
    subtitleEn: "",
    subtitleKn: "",
    type: "text",
    required: true,
    placeholderEn: "",
    placeholderKn: "",
    acceptedTypes: "image/*,.pdf",
    active: true,
  });

  const config = data?.config;
  const fields = data?.fields || [];

  // Config Save Handler
  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!config) return;

    setSavingConfig(true);
    const formData = new FormData(e.currentTarget);
    const updatedConfigPayload = {
      badgeText: String(formData.get("badgeText")),
      titleEn: String(formData.get("titleEn")),
      titleKn: String(formData.get("titleKn")),
      subTitleEn: String(formData.get("subTitleEn")),
      subTitleKn: String(formData.get("subTitleKn")),
      guidanceTitleEn: String(formData.get("guidanceTitleEn")),
      guidanceTitleKn: String(formData.get("guidanceTitleKn")),
      guidanceSubEn: String(formData.get("guidanceSubEn")),
    };

    try {
      await api("/api/form-control/config", {
        method: "PATCH",
        body: updatedConfigPayload,
      });
      toast.success("Application form header configuration saved!");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingField(null);
    setFieldForm({
      fieldKey: `custom_field_${Date.now()}`,
      titleEn: "",
      titleKn: "",
      subtitleEn: "",
      subtitleKn: "",
      type: "text",
      required: true,
      placeholderEn: "",
      placeholderKn: "",
      acceptedTypes: "image/*,.pdf",
      active: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (f: FormFieldData) => {
    setEditingField(f);
    setFieldForm({ ...f });
    setIsModalOpen(true);
  };

  // Save Field (Create or Update)
  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingField) {
        await api(`/api/form-control/fields/${editingField.id}`, {
          method: "PUT",
          body: fieldForm,
        });
        toast.success("Field updated successfully!");
      } else {
        await api("/api/form-control/fields", {
          method: "POST",
          body: fieldForm,
        });
        toast.success("New field added to application form!");
      }
      setIsModalOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save field");
    }
  };

  // Delete Field
  const handleDeleteField = async (f: FormFieldData) => {
    if (!confirm(`Are you sure you want to delete field "${f.titleEn}"?`)) return;

    try {
      await api(`/api/form-control/fields/${f.id}`, {
        method: "DELETE",
      });
      toast.success("Field deleted");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete field");
    }
  };

  // Toggle Active State
  const handleToggleActive = async (f: FormFieldData) => {
    try {
      await api(`/api/form-control/fields/${f.id}`, {
        method: "PUT",
        body: { active: !f.active },
      });
      toast.success(`Field set to ${!f.active ? "Active" : "Inactive"}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted">Loading form control data...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-sm text-red-600">Failed to load form control data</div>;
  }

  return (
    <div className="space-y-10 pb-16">
      <PageHeader
        title="Application Form Control"
        subtitle="Fully manage page headers, titles, bilingual instructions, and form fields dynamically."
      />

      {/* Header & Titles Configuration Card */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-ink mb-1">1. Form Page Header & Guidance Text</h3>
        <p className="text-xs text-muted mb-6">
          Edit titles, subheadings, and instructions displayed at the top of the application page.
        </p>

        {config && (
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Badge Tagline</label>
                <TextInput name="badgeText" defaultValue={config.badgeText} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Page Title (English)</label>
                <TextInput name="titleEn" defaultValue={config.titleEn} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Page Title (Kannada / ಕನ್ನಡ)</label>
                <TextInput name="titleKn" defaultValue={config.titleKn} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Main Subtitle (English)</label>
                <TextInput name="subTitleEn" defaultValue={config.subTitleEn} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Main Subtitle (Kannada / ಕನ್ನಡ)</label>
                <TextInput name="subTitleKn" defaultValue={config.subTitleKn} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Guidance Box Title (English)</label>
                <TextInput name="guidanceTitleEn" defaultValue={config.guidanceTitleEn} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Guidance Box Title (Kannada / ಕನ್ನಡ)</label>
                <TextInput name="guidanceTitleKn" defaultValue={config.guidanceTitleKn} required />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-ink block mb-1">Guidance Subtitle / Instructions (English)</label>
                <TextareaInput name="guidanceSubEn" defaultValue={config.guidanceSubEn} rows={2} required />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? "Saving Header Config..." : "Save Page Header Settings"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Form Fields Control List */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink">2. Form Fields Management ({fields.length} Fields)</h3>
            <p className="text-xs text-muted">
              Add new fields, modify questions, toggle required flags, or change field order.
            </p>
          </div>

          <Button onClick={openAddModal} variant="primary">
            ➕ Add New Form Field
          </Button>
        </div>

        {/* Fields List */}
        <div className="space-y-3">
          {fields.map((f, index) => (
            <div
              key={f.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                f.active ? "border-line bg-white" : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron/10 text-saffron text-xs font-bold">
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink text-sm">
                      {f.titleEn}
                    </span>
                    <span className="text-saffron text-xs font-medium">
                      ({f.titleKn})
                    </span>
                    <span className="rounded-md bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-muted border">
                      {f.type}
                    </span>
                    {f.required ? (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        Required
                      </span>
                    ) : (
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Optional
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted truncate mt-0.5">
                    Key: <code className="font-mono text-ink">{f.fieldKey}</code>
                    {f.subtitleEn && ` • ${f.subtitleEn}`}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    f.active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {f.active ? "Active" : "Disabled"}
                </button>

                <Button variant="ghost" onClick={() => openEditModal(f)}>
                  Edit
                </Button>

                <button
                  type="button"
                  onClick={() => handleDeleteField(f)}
                  className="rounded-lg p-1.5 text-xs text-rose-600 hover:bg-rose-50 transition"
                  title="Delete field"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Field Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-lg font-bold text-ink">
                {editingField ? `Edit Field: ${editingField.titleEn}` : "Add New Form Field"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-dark text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Field Unique Key</label>
                  <TextInput
                    value={fieldForm.fieldKey || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, fieldKey: e.target.value }))}
                    placeholder="e.g. blood_group"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Field Input Type</label>
                  <select
                    value={fieldForm.type || "text"}
                    onChange={(e) =>
                      setFieldForm((prev) => ({ ...prev, type: e.target.value as any }))
                    }
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold"
                  >
                    <option value="text">Text Input (Short)</option>
                    <option value="tel">Phone / Mobile Number</option>
                    <option value="textarea">Textarea (Multi-line)</option>
                    <option value="file">File Upload (Cloudflare R2)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Title (English) *</label>
                  <TextInput
                    value={fieldForm.titleEn || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                    placeholder="Title in English"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Title (Kannada / ಕನ್ನಡ) *</label>
                  <TextInput
                    value={fieldForm.titleKn || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, titleKn: e.target.value }))}
                    placeholder="ಕನ್ನಡದಲ್ಲಿ ಶೀರ್ಷಿಕೆ"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Subtitle / Hint (English)</label>
                  <TextInput
                    value={fieldForm.subtitleEn || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, subtitleEn: e.target.value }))}
                    placeholder="Help text or file format note"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Subtitle / Hint (Kannada)</label>
                  <TextInput
                    value={fieldForm.subtitleKn || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, subtitleKn: e.target.value }))}
                    placeholder="ಕನ್ನಡದಲ್ಲಿ ಸುಳಿವು ಉದಾ: ಗರಿಷ್ಠ 50MB"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Placeholder (English)</label>
                  <TextInput
                    value={fieldForm.placeholderEn || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, placeholderEn: e.target.value }))}
                    placeholder="Placeholder text"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Placeholder (Kannada)</label>
                  <TextInput
                    value={fieldForm.placeholderKn || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, placeholderKn: e.target.value }))}
                    placeholder="ಕನ್ನಡ placeholder"
                  />
                </div>

                {fieldForm.type === "file" && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-ink block mb-1">Accepted File Types</label>
                    <TextInput
                      value={fieldForm.acceptedTypes || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, acceptedTypes: e.target.value }))}
                      placeholder="e.g. image/*,.pdf"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-line">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldForm.required ?? true}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, required: e.target.checked }))}
                    className="h-4 w-4 rounded accent-saffron"
                  />
                  <span>Required Field *</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldForm.active ?? true}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, active: e.target.checked }))}
                    className="h-4 w-4 rounded accent-saffron"
                  />
                  <span>Active on Form</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingField ? "Update Field" : "Create Field"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
