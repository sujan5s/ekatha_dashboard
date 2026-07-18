export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "color"
  | "emoji";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: { label: string; value: string }[];
  /** For type "image": the sibling field that stores the UploadThing key. */
  imageKeyField?: string;
  /** For type "image": max long-edge px before upload. */
  maxEdge?: number;
}

export interface ResourceItem {
  id: string;
  order?: number;
}

export interface ResourceConfig<T extends ResourceItem = ResourceItem> {
  endpoint: string;
  title: string;
  subtitle?: string;
  singular: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  reorderable?: boolean;
  /** Boolean field shown as an inline publish/active toggle, e.g. "published". */
  toggleField?: string;
  toggleLabels?: { on: string; off: string };
  renderPrimary: (item: T) => string;
  renderSecondary?: (item: T) => string;
  thumbnail?: (item: T) => string | undefined;
}
