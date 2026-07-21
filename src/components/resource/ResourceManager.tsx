"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImageUpload from "@/components/ui/ImageUpload";
import { Field, TextInput, TextArea, Select } from "@/components/ui/Field";
import type { FieldDef, ResourceConfig, ResourceItem } from "./types";

/** Dynamic field access on a typed item without an index signature. */
const rec = (o: unknown): Record<string, unknown> => o as Record<string, unknown>;

export default function ResourceManager<T extends ResourceItem>({
  config,
  banner,
}: {
  config: ResourceConfig<T>;
  banner?: (items: T[]) => React.ReactNode;
}) {
  const toast = useToast();
  const cacheKey = `/api/${config.endpoint}`;
  const {
    data: items,
    error,
    isLoading: loading,
    mutate,
  } = useSWR<T[]>(cacheKey, api);

  const safeItems = items || [];

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    }
  }, [error, toast]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...config.defaults });
    setModalOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    const initial: Record<string, unknown> = {};
    for (const f of config.fields) initial[f.name] = rec(item)[f.name];
    if (config.toggleField) initial[config.toggleField] = rec(item)[config.toggleField];
    setForm(initial);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        const optimisticUpdated = safeItems.map((i) =>
          i.id === editing.id ? ({ ...i, ...form } as T) : i
        );
        await mutate(
          async () => {
            const updated = await api<T>(`/api/${config.endpoint}/${editing.id}`, {
              method: "PATCH",
              body: form,
            });
            toast.success(`${config.singular} updated`);
            return safeItems.map((i) => (i.id === editing.id ? updated : i));
          },
          { optimisticData: optimisticUpdated, rollbackOnError: true, revalidate: false }
        );
      } else {
        const tempItem = { ...form, id: `temp-${Date.now()}` } as unknown as T;
        await mutate(
          async () => {
            const created = await api<T>(`/api/${config.endpoint}`, {
              method: "POST",
              body: form,
            });
            toast.success(`${config.singular} added`);
            return [...safeItems, created];
          },
          { optimisticData: [...safeItems, tempItem], rollbackOnError: true, revalidate: false }
        );
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: T) {
    const optimisticData = safeItems.filter((i) => i.id !== item.id);
    setDeleteTarget(null);
    try {
      await mutate(
        async () => {
          await api(`/api/${config.endpoint}/${item.id}`, { method: "DELETE" });
          toast.success(`${config.singular} deleted`);
          return optimisticData;
        },
        { optimisticData, rollbackOnError: true, revalidate: false }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function toggle(item: T) {
    const field = config.toggleField!;
    const newValue = !rec(item)[field];
    const optimisticData = safeItems.map((i) =>
      i.id === item.id ? ({ ...i, [field]: newValue } as T) : i
    );
    try {
      await mutate(
        async () => {
          await api(`/api/${config.endpoint}/${item.id}`, {
            method: "PATCH",
            body: { [field]: newValue },
          });
          return optimisticData;
        },
        { optimisticData, rollbackOnError: true, revalidate: false }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= safeItems.length) return;
    const reordered = [...safeItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved!);
    
    try {
      await mutate(
        async () => {
          await api(`/api/${config.endpoint}/reorder`, {
            method: "POST",
            body: { ids: reordered.map((i) => i.id) },
          });
          return reordered;
        },
        { optimisticData: reordered, rollbackOnError: true, revalidate: false }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed");
    }
  }

  return (
    <>
      {!loading && banner ? banner(safeItems) : null}
      <div className="flex flex-col gap-3">
        {loading ? (
          <ListSkeleton />
        ) : safeItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/50 py-16 text-center text-sm text-muted">
            No {config.singular.toLowerCase()} yet. Click “Add {config.singular}”
            to create one.
          </div>
        ) : (
          safeItems.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm"
            >
              {config.reorderable && (
                <div className="flex flex-col text-muted">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-1 leading-none hover:text-ink disabled:opacity-25"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === safeItems.length - 1}
                    className="px-1 leading-none hover:text-ink disabled:opacity-25"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>
              )}

              {config.thumbnail?.(item) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.thumbnail(item)}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">
                  {config.renderPrimary(item)}
                </div>
                {config.renderSecondary && (
                  <div className="truncate text-sm text-muted">
                    {config.renderSecondary(item)}
                  </div>
                )}
              </div>

              {config.toggleField && (
                <button
                  onClick={() => toggle(item)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    rec(item)[config.toggleField]
                      ? "bg-success/10 text-success"
                      : "bg-line text-muted"
                  }`}
                >
                  {rec(item)[config.toggleField]
                    ? (config.toggleLabels?.on ?? "Published")
                    : (config.toggleLabels?.off ?? "Hidden")}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5">
        <Button onClick={openCreate}>+ Add {config.singular}</Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? "Edit" : "Add"} ${config.singular}`}
        wide
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.fields.map((f) => (
            <div
              key={f.name}
              className={f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""}
            >
              <FieldControl
                def={f}
                value={form[f.name]}
                onChange={(val) => setForm((s) => ({ ...s, [f.name]: val }))}
                onImage={(res) =>
                  setForm((s) => ({
                    ...s,
                    [f.name]: res.url,
                    ...(f.imageKeyField ? { [f.imageKeyField]: res.key } : {}),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {editing ? "Save changes" : `Add ${config.singular}`}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${config.singular.toLowerCase()}?`}
        message="This can't be undone. It will be removed from the live site immediately."
        onConfirm={async () => {
          if (deleteTarget) await remove(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function FieldControl({
  def,
  value,
  onChange,
  onImage,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  onImage: (res: { url: string; key: string }) => void;
}) {
  if (def.type === "image") {
    return (
      <Field label={def.label} hint={def.hint}>
        <ImageUpload
          url={typeof value === "string" ? value : ""}
          onChange={onImage}
          maxEdge={def.maxEdge}
        />
      </Field>
    );
  }
  if (def.type === "boolean") {
    return (
      <Field label={def.label} hint={def.hint}>
        <select
          value={value ? "1" : "0"}
          onChange={(e) => onChange(e.target.value === "1")}
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm"
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </Field>
    );
  }
  if (def.type === "select") {
    return (
      <Field label={def.label} hint={def.hint}>
        <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  if (def.type === "textarea") {
    return (
      <Field label={def.label} hint={def.hint}>
        <TextArea
          rows={4}
          value={String(value ?? "")}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }
  if (def.type === "number") {
    return (
      <Field label={def.label} hint={def.hint}>
        <TextInput
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={def.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      </Field>
    );
  }
  if (def.type === "color") {
    return (
      <Field label={def.label} hint={def.hint}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? "#000000")}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 rounded-lg border border-line"
          />
          <TextInput
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#E85D04"
          />
        </div>
      </Field>
    );
  }
  // text + emoji
  return (
    <Field label={def.label} hint={def.hint}>
      <TextInput
        value={String(value ?? "")}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={def.type === "emoji" ? "w-20 text-center text-lg" : ""}
      />
    </Field>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/60" />
      ))}
    </div>
  );
}
