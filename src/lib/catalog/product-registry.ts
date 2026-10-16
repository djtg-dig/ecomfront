export type CategorySource = "legacy" | "registry";
export type AttributeKind = "string" | "integer" | "decimal" | "boolean" | "select" | "multi_select";
export type AttributeValue = string | string[];

export type RegistryCategorySummary = {
  code: string;
  label: string;
  parent: string;
  description: string;
};

export type RegistryAttribute = {
  code: string;
  label: string;
  type: AttributeKind;
  required: boolean;
  unit: string;
  options: string[];
  min_value: string | null;
  max_value: string | null;
  variant: boolean;
};

export type RegistryCategoryDetail = RegistryCategorySummary & {
  attributes: RegistryAttribute[];
};

export type LegacyAttribute = {
  code: string;
  name: string;
  data_type: "text" | "integer" | "decimal" | "boolean" | "choice" | "date";
  unit: string;
  is_required: boolean;
  is_variant_axis: boolean;
  options?: { value: string; label: string }[];
};

export type DynamicAttribute = {
  code: string;
  label: string;
  kind: AttributeKind | "date";
  required: boolean;
  unit: string;
  options: { value: string; label: string }[];
  minimum: string | null;
  maximum: string | null;
  variant: boolean;
};

export function registryAttributes(category: RegistryCategoryDetail): DynamicAttribute[] {
  return category.attributes.map((attribute) => ({
    code: attribute.code,
    label: attribute.label,
    kind: attribute.type,
    required: attribute.required,
    unit: attribute.unit,
    options: attribute.options.map((value) => ({ value, label: value })),
    minimum: attribute.min_value,
    maximum: attribute.max_value,
    variant: attribute.variant,
  }));
}

export function legacyAttributes(attributes: LegacyAttribute[]): DynamicAttribute[] {
  return attributes.map((attribute) => ({
    code: attribute.code,
    label: attribute.name,
    kind: attribute.data_type === "text"
      ? "string"
      : attribute.data_type === "choice"
        ? "select"
        : attribute.data_type,
    required: attribute.is_required,
    unit: attribute.unit,
    options: attribute.options ?? [],
    minimum: null,
    maximum: null,
    variant: attribute.is_variant_axis,
  }));
}

export function initialAttributeValues(values: Record<string, unknown>): Record<string, AttributeValue> {
  return Object.fromEntries(
    Object.entries(values).map(([code, value]) => [
      code,
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : value == null
          ? ""
          : String(value),
    ]),
  );
}

export function categoryPayload(source: CategorySource, code: string) {
  return source === "registry" ? { category_code: code } : { category: code };
}

export function normalizeProductAttributes(
  schema: DynamicAttribute[],
  values: Record<string, AttributeValue>,
): { attributes: Record<string, unknown>; errors: Record<string, string> } {
  const attributes: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of schema.filter((attribute) => !attribute.variant)) {
    const value = values[field.code];
    const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (field.required) errors[field.code] = `${field.label} est obligatoire.`;
      continue;
    }
    if (field.kind === "multi_select") {
      if (!Array.isArray(value) || (field.options.length > 0 && value.some((item) => !field.options.some((option) => option.value === item)))) {
        errors[field.code] = `La sélection de ${field.label} est invalide.`;
      } else {
        attributes[field.code] = value;
      }
      continue;
    }
    if (Array.isArray(value)) {
      errors[field.code] = `${field.label} est invalide.`;
      continue;
    }
    if (field.kind === "integer" || field.kind === "decimal") {
      const validInteger = /^-?\d+$/.test(value);
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || (field.kind === "integer" && !validInteger)) {
        errors[field.code] = `${field.label} doit être un nombre${field.kind === "integer" ? " entier" : ""}.`;
        continue;
      }
      if (field.minimum !== null && numericValue < Number(field.minimum)) {
        errors[field.code] = `${field.label} doit être supérieur ou égal à ${field.minimum}.`;
        continue;
      }
      if (field.maximum !== null && numericValue > Number(field.maximum)) {
        errors[field.code] = `${field.label} doit être inférieur ou égal à ${field.maximum}.`;
        continue;
      }
      attributes[field.code] = field.kind === "integer" ? numericValue : value;
      continue;
    }
    if (field.kind === "boolean") {
      if (value !== "true" && value !== "false") {
        errors[field.code] = `${field.label} doit être activé ou désactivé.`;
      } else {
        attributes[field.code] = value === "true";
      }
      continue;
    }
    if (field.kind === "select") {
      if (!field.options.some((option) => option.value === value)) {
        errors[field.code] = `L’option choisie pour ${field.label} est invalide.`;
      } else {
        attributes[field.code] = value;
      }
      continue;
    }
    attributes[field.code] = value;
  }

  return { attributes, errors };
}

export function filterRegistryCategories(categories: RegistryCategorySummary[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("fr");
  if (!normalized) return categories;
  return categories.filter((category) =>
    `${category.label} ${category.parent} ${category.code}`.toLocaleLowerCase("fr").includes(normalized),
  );
}
