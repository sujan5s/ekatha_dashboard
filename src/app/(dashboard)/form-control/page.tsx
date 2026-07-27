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

  const [activeTab, setActiveTab] = useState<"fields" | "header" | "preview">("fields");
  const [savingConfig, setSavingConfig] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Field Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldData | null>(null);
  const [previewLang, setPreviewLang] = useState<"en" | "kn">("en");

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

  // Filtered fields
  const filteredFields = fields.filter((f) => {
    const matchesSearch =
      f.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.titleKn.includes(searchQuery) ||
      f.fieldKey.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || f.type === filterType;
    return matchesSearch && matchesType;
  });

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
      toast.success("Header and guidance settings saved successfully!");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  // Reorder Handler (Move up or down)
  const handleMoveField = async (index: number, direction: "up" | "down") => {
    if (reordering) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    setReordering(true);
    const newFields = [...fields];
    const [moved] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, moved);

    const reorderedIds = newFields.map((f) => f.id);

    try {
      await api("/api/form-control/reorder", {
        method: "PUT",
        body: { ids: reorderedIds },
      });
      toast.success("Field order updated!");
      await mutate();
    } catch (err) {
      toast.error("Failed to reorder fields");
    } finally {
      setReordering(false);
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
        toast.success("Form field updated!");
      } else {
        await api("/api/form-control/fields", {
          method: "POST",
          body: fieldForm,
        });
        toast.success("New form field added!");
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

  // Toggle Required State
  const handleToggleRequired = async (f: FormFieldData) => {
    try {
      await api(`/api/form-control/fields/${f.id}`, {
        method: "PUT",
        body: { required: !f.required },
      });
      toast.success(`Field updated to ${!f.required ? "Required" : "Optional"}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron border-t-transparent mx-auto" />
          <p className="text-sm font-medium text-muted">Loading Application Form Control...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center text-red-600">
        <p className="font-semibold text-base mb-1">Failed to load Form Control data</p>
        <p className="text-xs text-red-500">Please check your server connection and try again.</p>
      </div>
    );
  }

  const activeCount = fields.filter((f) => f.active).length;
  const requiredCount = fields.filter((f) => f.required).length;
  const fileCount = fields.filter((f) => f.type === "file").length;

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Application Form Control"
        subtitle="Manage bilingual titles, guidance instructions, and dynamic form questions in real time."
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-line pb-4 gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-gray-100/80 p-1.5 border border-line">
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "fields"
                ? "bg-white text-ink shadow-sm"
                : "text-muted hover:text-ink hover:bg-white/50"
            }`}
          >
            <span>📝 Form Fields</span>
            <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-[10px] text-saffron">
              {fields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("header")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "header"
                ? "bg-white text-ink shadow-sm"
                : "text-muted hover:text-ink hover:bg-white/50"
            }`}
          >
            <span>🏷️ Header & Guidance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "preview"
                ? "bg-white text-saffron shadow-sm"
                : "text-muted hover:text-ink hover:bg-white/50"
            }`}
          >
            <span>👁️ Live Preview</span>
          </button>
        </div>

        {activeTab === "fields" && (
          <Button onClick={openAddModal} variant="primary" className="shadow-sm">
            ➕ Add New Form Field
          </Button>
        )}
      </div>

      {/* TAB 1: FORM FIELDS MANAGEMENT */}
      {activeTab === "fields" && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Total Questions</span>
              <span className="text-2xl font-black text-ink mt-1 block">{fields.length}</span>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Active Fields</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeCount}</span>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Required Inputs</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{requiredCount}</span>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">File Uploads</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">{fileCount}</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search questions by title or field key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-line bg-gray-50/50 pl-9 pr-4 py-2 text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron/30 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-xl border border-line bg-gray-50 px-3 py-2 text-xs font-semibold text-ink focus:bg-white focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="text">Text Input</option>
                <option value="tel">Phone Number</option>
                <option value="textarea">Textarea</option>
                <option value="file">File Upload</option>
              </select>
            </div>
          </div>

          {/* Fields List Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Form Questions Sequence ({filteredFields.length})</h3>
              <p className="text-xs text-muted">Use ⬆️ ⬇️ to reorder questions on the applicant form.</p>
            </div>

            {filteredFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center text-muted">
                <span className="text-3xl block mb-2">📋</span>
                <p className="text-sm font-semibold text-ink">No form fields found</p>
                <p className="text-xs text-muted mt-1">Try clearing your search query or add a new field.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFields.map((f, idx) => {
                  const actualIndex = fields.findIndex((item) => item.id === f.id);
                  return (
                    <div
                      key={f.id}
                      className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all hover:shadow-sm ${
                        f.active ? "border-line bg-white" : "border-gray-200 bg-gray-50/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={actualIndex === 0 || reordering}
                            onClick={() => handleMoveField(actualIndex, "up")}
                            className="rounded p-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={actualIndex === fields.length - 1 || reordering}
                            onClick={() => handleMoveField(actualIndex, "down")}
                            className="rounded p-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Question Number Badge */}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron/10 text-saffron text-xs font-bold">
                          {actualIndex + 1}
                        </span>

                        {/* Title & Subtitles */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-ink text-sm">{f.titleEn}</span>
                            <span className="text-saffron text-xs font-semibold">({f.titleKn})</span>

                            {/* Type Badge */}
                            <span className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-muted border border-amber-200/60">
                              {f.type === "file" && "📁"}
                              {f.type === "tel" && "📞"}
                              {f.type === "textarea" && "📝"}
                              {f.type === "text" && "📄"}
                              {f.type}
                            </span>

                            {/* Required Badge (Clickable) */}
                            <button
                              type="button"
                              onClick={() => handleToggleRequired(f)}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition border ${
                                f.required
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                              }`}
                              title="Click to toggle required status"
                            >
                              {f.required ? "Required *" : "Optional"}
                            </button>
                          </div>

                          <div className="text-xs text-muted truncate mt-1 flex items-center gap-3">
                            <span>Key: <code className="font-mono text-ink bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{f.fieldKey}</code></span>
                            {f.subtitleEn && <span className="hidden sm:inline">• {f.subtitleEn}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Active Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(f)}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                            f.active
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {f.active ? "● Active" : "○ Disabled"}
                        </button>

                        <Button variant="ghost" onClick={() => openEditModal(f)}>
                          Edit
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleDeleteField(f)}
                          className="rounded-lg p-2 text-xs text-rose-600 hover:bg-rose-50 transition"
                          title="Delete field"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAGE HEADER & GUIDANCE CONFIG */}
      {activeTab === "header" && config && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Main Titles Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-line pb-4">
              <h3 className="text-base font-bold text-ink">1. Form Hero & Main Titles</h3>
              <p className="text-xs text-muted mt-0.5">
                These titles appear right at the top of the applicant help form.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-ink block mb-1">Badge Tagline (English & Kannada)</label>
                <TextInput name="badgeText" defaultValue={config.badgeText} required />
              </div>

              {/* Side by Side English & Kannada Page Titles */}
              <div className="grid gap-4 sm:grid-cols-2 bg-gray-50/50 p-4 rounded-xl border border-line">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🇬🇧</span>
                    <label className="text-xs font-bold text-ink">Page Main Title (English)</label>
                  </div>
                  <TextInput name="titleEn" defaultValue={config.titleEn} required />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🇮🇳</span>
                    <label className="text-xs font-bold text-ink">Page Main Title (Kannada / ಕನ್ನಡ)</label>
                  </div>
                  <TextInput name="titleKn" defaultValue={config.titleKn} required />
                </div>
              </div>

              {/* Side by Side Subtitles */}
              <div className="grid gap-4 sm:grid-cols-2 bg-gray-50/50 p-4 rounded-xl border border-line">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🇬🇧</span>
                    <label className="text-xs font-bold text-ink">Main Subtitle (English)</label>
                  </div>
                  <TextInput name="subTitleEn" defaultValue={config.subTitleEn} required />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🇮🇳</span>
                    <label className="text-xs font-bold text-ink">Main Subtitle (Kannada / ಕನ್ನಡ)</label>
                  </div>
                  <TextInput name="subTitleKn" defaultValue={config.subTitleKn} required />
                </div>
              </div>
            </div>
          </div>

          {/* Guidance Box Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-line pb-4">
              <h3 className="text-base font-bold text-ink">2. Instructions & Guidance Banner</h3>
              <p className="text-xs text-muted mt-0.5">
                The callout box explaining instructions to applicants before filling out the form.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 bg-amber-50/30 p-4 rounded-xl border border-amber-200/60">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🇬🇧</span>
                    <label className="text-xs font-bold text-ink">Guidance Box Title (English)</label>
                  </div>
                  <TextInput name="guidanceTitleEn" defaultValue={config.guidanceTitleEn} required />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🇮🇳</span>
                    <label className="text-xs font-bold text-ink">Guidance Box Title (Kannada / ಕನ್ನಡ)</label>
                  </div>
                  <TextInput name="guidanceTitleKn" defaultValue={config.guidanceTitleKn} required />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Guidance Detailed Instructions (English)</label>
                <TextareaInput name="guidanceSubEn" defaultValue={config.guidanceSubEn} rows={3} required />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <Button type="submit" disabled={savingConfig} variant="primary">
                {savingConfig ? "Saving Changes..." : "💾 Save Header & Guidance Settings"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: REAL-TIME INTERACTIVE LIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-ink">Live Form Preview</h3>
              <p className="text-xs text-muted">See how applicants view the form in real time.</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1 border border-line">
              <button
                type="button"
                onClick={() => setPreviewLang("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  previewLang === "en" ? "bg-white text-ink shadow-sm" : "text-muted"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang("kn")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  previewLang === "kn" ? "bg-white text-saffron shadow-sm" : "text-muted"
                }`}
              >
                🇮🇳 ಕನ್ನಡ
              </button>
            </div>
          </div>

          {/* Form Preview Card Mock */}
          <div className="rounded-3xl border border-line bg-white p-8 shadow-md space-y-6 max-w-3xl mx-auto">
            {config && (
              <div className="text-center space-y-3 pb-6 border-b border-line">
                <span className="inline-block rounded-full bg-saffron/10 px-3 py-1 text-xs font-semibold text-saffron">
                  {config.badgeText}
                </span>
                <h2 className="text-2xl font-black text-ink">
                  {previewLang === "en" ? config.titleEn : config.titleKn}
                </h2>
                <p className="text-xs text-muted max-w-lg mx-auto">
                  {previewLang === "en" ? config.subTitleEn : config.subTitleKn}
                </p>
              </div>
            )}

            {/* Guidance Box Preview */}
            {config && (
              <div className="rounded-2xl border border-saffron/30 bg-amber-50/40 p-5 space-y-2">
                <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <span>💡</span>
                  <span>{previewLang === "en" ? config.guidanceTitleEn : config.guidanceTitleKn}</span>
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {config.guidanceSubEn}
                </p>
              </div>
            )}

            {/* Form Fields Preview */}
            <div className="space-y-4 pt-4">
              {fields
                .filter((f) => f.active)
                .map((f, idx) => (
                  <div key={f.id} className="space-y-1.5">
                    <label className="text-xs font-bold text-ink block">
                      {idx + 1}. {previewLang === "en" ? f.titleEn : f.titleKn}
                      {f.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>

                    {(f.subtitleEn || f.subtitleKn) && (
                      <p className="text-[11px] text-muted">
                        {previewLang === "en" ? f.subtitleEn : f.subtitleKn}
                      </p>
                    )}

                    {f.type === "textarea" ? (
                      <textarea
                        disabled
                        rows={2}
                        placeholder={previewLang === "en" ? f.placeholderEn : f.placeholderKn}
                        className="w-full rounded-xl border border-line bg-gray-50/50 p-3 text-xs opacity-75"
                      />
                    ) : f.type === "file" ? (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-muted">
                        📁 Drag and drop file or click to browse ({f.acceptedTypes})
                      </div>
                    ) : (
                      <input
                        disabled
                        type={f.type === "tel" ? "tel" : "text"}
                        placeholder={previewLang === "en" ? f.placeholderEn : f.placeholderKn}
                        className="w-full rounded-xl border border-line bg-gray-50/50 p-3 text-xs opacity-75"
                      />
                    )}
                  </div>
                ))}
            </div>

            <div className="pt-4 border-t border-line text-center">
              <Button variant="primary" disabled className="w-full sm:w-auto px-8">
                Submit Application Form (Preview)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT FIELD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">
                  {editingField ? `Edit Question: ${editingField.titleEn}` : "Add New Form Question"}
                </h3>
                <p className="text-xs text-muted">Configure question key, bilingual titles, and input rules.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-dark text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveField} className="space-y-5">
              {/* Field Key & Type */}
              <div className="grid gap-4 sm:grid-cols-2 bg-gray-50/70 p-4 rounded-xl border border-line">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Field Unique Key *</label>
                  <TextInput
                    value={fieldForm.fieldKey || ""}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, fieldKey: e.target.value }))}
                    placeholder="e.g. applicant_aadhaar"
                    required
                  />
                  <span className="text-[10px] text-muted mt-1 block">Used in database exports & server API</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Field Input Type *</label>
                  <select
                    value={fieldForm.type || "text"}
                    onChange={(e) =>
                      setFieldForm((prev) => ({ ...prev, type: e.target.value as any }))
                    }
                    className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-bold text-ink focus:outline-none"
                  >
                    <option value="text">📄 Text Input (Short Single Line)</option>
                    <option value="tel">📞 Phone / Mobile Number</option>
                    <option value="textarea">📝 Textarea (Multi-line Address/Details)</option>
                    <option value="file">📁 File Upload (Cloudflare R2 Storage)</option>
                  </select>
                </div>
              </div>

              {/* Bilingual Titles */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Title (English) *</label>
                    <TextInput
                      value={fieldForm.titleEn || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="Full Name"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Title (Kannada / ಕನ್ನಡ) *</label>
                    <TextInput
                      value={fieldForm.titleKn || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, titleKn: e.target.value }))}
                      placeholder="ಪೂರ್ಣ ಹೆಸರು"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Subtitle / Hint (English)</label>
                    <TextInput
                      value={fieldForm.subtitleEn || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, subtitleEn: e.target.value }))}
                      placeholder="As per official ID card"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Subtitle / Hint (Kannada)</label>
                    <TextInput
                      value={fieldForm.subtitleKn || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, subtitleKn: e.target.value }))}
                      placeholder="ಅಧಿಕೃತ ಗುರುತಿನ ಚೀಟಿಯಂತೆ"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Placeholder (English)</label>
                    <TextInput
                      value={fieldForm.placeholderEn || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, placeholderEn: e.target.value }))}
                      placeholder="Enter name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Placeholder (Kannada)</label>
                    <TextInput
                      value={fieldForm.placeholderKn || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, placeholderKn: e.target.value }))}
                      placeholder="ಹೆಸರನ್ನು ನಮೂದಿಸಿ"
                    />
                  </div>
                </div>

                {fieldForm.type === "file" && (
                  <div>
                    <label className="text-xs font-bold text-ink block mb-1">Accepted File Extensions</label>
                    <TextInput
                      value={fieldForm.acceptedTypes || ""}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, acceptedTypes: e.target.value }))}
                      placeholder="image/*,.pdf,.doc"
                    />
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-3 border-t border-line bg-gray-50/50 p-3 rounded-xl">
                <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldForm.required ?? true}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, required: e.target.checked }))}
                    className="h-4 w-4 rounded accent-saffron"
                  />
                  <span>Required Question *</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldForm.active ?? true}
                    onChange={(e) => setFieldForm((prev) => ({ ...prev, active: e.target.checked }))}
                    className="h-4 w-4 rounded accent-saffron"
                  />
                  <span>Active on Live Form</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingField ? "Update Question" : "Create Question"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
