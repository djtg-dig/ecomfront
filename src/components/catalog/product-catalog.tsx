"use client";

import Link from "next/link";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { Modal } from "@/components/ui/modal";
import { formatPriceRange } from "@/lib/money/format";
import { ProductMediaManager } from "@/components/catalog/product-media-manager";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatMessage, unitLabel } from "@/lib/i18n/messages";
import {
  categoryPayload,
  filterRegistryCategories,
  initialAttributeValues,
  legacyAttributes,
  normalizeProductAttributes,
  registryAttributes,
  type AttributeValue,
  type CategorySource,
  type DynamicAttribute,
  type LegacyAttribute,
  type RegistryCategoryDetail,
  type RegistryCategorySummary,
} from "@/lib/catalog/product-registry";

type LegacyCategory = { code: string; name: string };
type Status = "ACTIVE" | "INACTIVE" | "ARCHIVED";
type Product = {
  public_id: string;
  name: string;
  description: string;
  category: string;
  category_code: string | null;
  category_name: string;
  category_source: CategorySource;
  product_type_key: string | null;
  internal_reference: string | null;
  barcode: string | null;
  unit_of_measure?: string;
  unit_symbol?: string;
  selling_price: string;
  min_price?: string | null;
  max_price?: string | null;
  is_negotiable: boolean;
  cost_price: string | null;
  currency: string;
  attributes: Record<string, unknown>;
  status: Status;
  primary_image_url: string | null;
};

type CategoryChoice = {
  code: string;
  label: string;
  group: string;
  source: CategorySource;
};
type UnitOfMeasure = { code: string; name: string; symbol: string; category: string };

type ApiProblem = { detail: string; errors: Record<string, string[]> };
type ProductListResponse = { products: Product[]; pagination: { count: number; next: string | null; previous: string | null } };

async function readProblem(response: Response): Promise<ApiProblem> {
  try {
    const payload = await response.json() as { detail?: string; errors?: Record<string, string[]> };
    return { detail: payload.detail ?? "Le catalogue est indisponible.", errors: payload.errors ?? {} };
  } catch {
    return { detail: "Le catalogue est indisponible.", errors: {} };
  }
}

async function detail(response: Response) {
  return (await readProblem(response)).detail;
}

function sourceForProduct(product?: Product): CategorySource {
  if (!product) return "registry";
  return product.category_source ?? (product.category_code ? "registry" : "legacy");
}

function priceRange(product: Product) {
  return product.min_price !== null && product.min_price !== undefined && product.max_price !== null && product.max_price !== undefined
    ? `${formatPriceRange(product.min_price, product.max_price, product.currency)}${product.unit_symbol ? ` / ${product.unit_symbol}` : ""}`
    : null;
}

function ProductThumbnail({ product }: { product: Product }) {
  const { locale, t } = useLocale();
  const [failed, setFailed] = useState(false);
  if (!product.primary_image_url || failed) return <div aria-label={t("catalog", "unavailablePhoto")} className="grid size-14 shrink-0 place-items-center rounded bg-[var(--surface-muted)] text-xs text-[var(--muted)]">{t("catalog", "photo")}</div>;
  return <img alt="" className="size-14 shrink-0 rounded object-cover" onError={() => setFailed(true)} src={product.primary_image_url} />;
}

function defaultValues(schema: DynamicAttribute[], productValues?: Record<string, unknown>) {
  const values = productValues ? initialAttributeValues(productValues) : {};
  for (const attribute of schema) {
    if (attribute.kind === "boolean" && values[attribute.code] === undefined) {
      values[attribute.code] = "false";
    }
  }
  return values;
}

function DynamicAttributeField({
  attribute,
  error,
  onChange,
  value,
}: {
  attribute: DynamicAttribute;
  error?: string;
  onChange: (value: AttributeValue) => void;
  value?: AttributeValue;
}) {
  const { t } = useLocale();
  const fieldId = `product-attribute-${attribute.code}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  const describedBy = [attribute.unit || attribute.minimum !== null || attribute.maximum !== null ? helpId : "", error ? errorId : ""]
    .filter(Boolean)
    .join(" ") || undefined;
  const label = <>{attribute.label}{attribute.required ? " *" : ""}</>;
  const className = "mt-1 w-full rounded border p-2";

  let control;
  if (attribute.kind === "boolean") {
    control = <label className="mt-2 flex min-h-11 items-center gap-3 rounded border px-3 py-2" htmlFor={fieldId}>
      <input aria-describedby={describedBy} aria-labelledby={`${fieldId}-label`} checked={value === "true"} id={fieldId} onChange={(event) => onChange(String(event.target.checked))} type="checkbox" />
      <span>{t("catalog", "enabled")}</span>
    </label>;
  } else if (attribute.kind === "select") {
    control = <select aria-describedby={describedBy} className={className} id={fieldId} onChange={(event) => onChange(event.target.value)} required={attribute.required} value={Array.isArray(value) ? "" : value ?? ""}>
      <option value="">{t("catalog", "select")}</option>
      {attribute.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>;
  } else if (attribute.kind === "multi_select" && attribute.options.length) {
    control = <select aria-describedby={describedBy} className={`${className} min-h-28`} id={fieldId} multiple onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))} required={attribute.required} value={Array.isArray(value) ? value : []}>
      {attribute.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>;
  } else {
    const freeList = attribute.kind === "multi_select";
    control = <input
      aria-describedby={describedBy}
      className={className}
      id={fieldId}
      max={attribute.maximum ?? undefined}
      min={attribute.minimum ?? undefined}
      onChange={(event) => onChange(freeList ? event.target.value.split(",").map((item) => item.trim()).filter(Boolean) : event.target.value)}
      placeholder={freeList ? t("catalog", "separateValues") : undefined}
      required={attribute.required}
      step={attribute.kind === "integer" ? "1" : attribute.kind === "decimal" ? "any" : undefined}
      type={attribute.kind === "integer" || attribute.kind === "decimal" ? "number" : attribute.kind === "date" ? "date" : "text"}
      value={Array.isArray(value) ? value.join(", ") : value ?? ""}
    />;
  }

  return <div>
    {attribute.kind === "boolean" ? <span className="text-sm font-medium" id={`${fieldId}-label`}>{label}</span> : <label className="text-sm font-medium" htmlFor={fieldId}>{label}</label>}
    {control}
    {attribute.unit || attribute.minimum !== null || attribute.maximum !== null ? <p className="mt-1 text-xs text-[var(--muted)]" id={helpId}>
      {attribute.unit ? `${t("catalog", "unit")} : ${attribute.unit}. ` : ""}{attribute.minimum !== null ? `${t("catalog", "minimum")} : ${attribute.minimum}. ` : ""}{attribute.maximum !== null ? `${t("catalog", "maximum")} : ${attribute.maximum}.` : ""}
    </p> : null}
    {error ? <p className="mt-1 text-sm text-[var(--error)]" id={errorId} role="alert">{error}</p> : null}
  </div>;
}

function AttributeSection({ attributes, errors, legend, onChange, values }: {
  attributes: DynamicAttribute[];
  errors: Record<string, string>;
  legend: string;
  onChange: (code: string, value: AttributeValue) => void;
  values: Record<string, AttributeValue>;
}) {
  const { t } = useLocale();
  if (!attributes.length) return null;
  return <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
    <legend className="px-2 font-semibold text-[var(--brand-secondary)]">{legend}</legend>
    {attributes.map((attribute) => <DynamicAttributeField attribute={attribute} error={errors[attribute.code]} key={attribute.code} onChange={(value) => onChange(attribute.code, value)} value={values[attribute.code]} />)}
  </fieldset>;
}

function CategorySelector({ choices, disabled, loading, onChange, value }: {
  choices: CategoryChoice[];
  disabled: boolean;
  loading: boolean;
  onChange: (source: CategorySource, code: string) => void;
  value: string;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const registry = filterRegistryCategories(choices.filter((choice) => choice.source === "registry").map((choice) => ({ code: choice.code, description: "", label: choice.label, parent: choice.group })), query);
    const registryCodes = new Set(registry.map((category) => category.code));
    const normalized = query.trim().toLocaleLowerCase("fr");
    return choices.filter((choice) => choice.source === "registry" ? registryCodes.has(choice.code) : !normalized || `${choice.label} ${choice.code}`.toLocaleLowerCase("fr").includes(normalized));
  }, [choices, query]);
  const groups = filtered.reduce<Map<string, CategoryChoice[]>>((result, choice) => {
    result.set(choice.group, [...(result.get(choice.group) ?? []), choice]);
    return result;
  }, new Map());

  return <div className="grid gap-2">
    <label className="text-sm font-medium" htmlFor="product-category-search">{t("catalog", "searchCategory")}</label>
    <input autoComplete="off" className="w-full rounded border p-2" disabled={disabled || loading} id="product-category-search" onChange={(event) => setQuery(event.target.value)} placeholder={t("catalog", "searchByName")} type="search" value={query} />
    <label className="text-sm font-medium" htmlFor="product-category">{t("catalog", "category")} *</label>
    <select
      className="w-full rounded border p-2"
      disabled={disabled || loading}
      id="product-category"
      name="category_selection"
      onChange={(event) => {
        const [source, ...codeParts] = event.target.value.split(":");
        if ((source === "legacy" || source === "registry") && codeParts.length) onChange(source, codeParts.join(":"));
      }}
      required
      value={value}
    >
      <option value="">{loading ? t("catalog", "categoriesLoading") : t("catalog", "select")}</option>
      {[...groups.entries()].map(([group, options]) => <optgroup key={group} label={group}>{options.map((choice) => <option key={`${choice.source}:${choice.code}`} value={`${choice.source}:${choice.code}`}>{choice.label}</option>)}</optgroup>)}
    </select>
    {!loading && choices.length === 0 ? <p className="text-sm text-[var(--muted)]">{t("catalog", "noCategories")}</p> : null}
    {!loading && choices.length > 0 && filtered.length === 0 ? <p className="text-sm text-[var(--muted)]">{t("catalog", "noCategoryMatches")}</p> : null}
  </div>;
}

function ProductForm({ businessCurrency, businessId, categoriesLoading, legacyCategories, onRetryUnits, onSaved, product, registryCategories, units = [], unitsError, unitsLoading }: {
  businessCurrency: string;
  businessId: string;
  categoriesLoading: boolean;
  legacyCategories: LegacyCategory[];
  onSaved: (product: Product) => void;
  product?: Product;
  registryCategories: RegistryCategorySummary[];
  units?: UnitOfMeasure[];
  unitsError: boolean;
  unitsLoading: boolean;
  onRetryUnits: () => void;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const initialSource = sourceForProduct(product);
  const initialCode = product?.category_code ?? product?.category ?? "";
  const [categorySource, setCategorySource] = useState<CategorySource>(initialSource);
  const [categoryCode, setCategoryCode] = useState(initialCode);
  const [attributes, setAttributes] = useState<DynamicAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, AttributeValue>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [attributesLoading, setAttributesLoading] = useState(Boolean(initialCode));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [minimumPreview, setMinimumPreview] = useState(product?.min_price ?? product?.selling_price ?? "");
  const [maximumPreview, setMaximumPreview] = useState(product?.max_price ?? product?.selling_price ?? "");

  const choices = useMemo<CategoryChoice[]>(() => {
    const registryChoices = registryCategories.map((category) => ({ code: category.code, group: category.parent, label: category.label, source: "registry" as const }));
    if (!product) return registryChoices;
    const combined: CategoryChoice[] = [...registryChoices, ...legacyCategories.map((category) => ({ code: category.code, group: "Catégories historiques", label: category.name, source: "legacy" as const }))];
    if (!combined.some((choice) => choice.source === initialSource && choice.code === initialCode)) combined.push({ code: initialCode, group: initialSource === "legacy" ? "Catégories historiques" : "Registre", label: product.category_name, source: initialSource });
    return combined;
  }, [initialCode, initialSource, legacyCategories, product, registryCategories]);

  useEffect(() => {
    if (!categoryCode) return;
    let cancelled = false;
    const path = categorySource === "registry" ? `/api/private/catalog/registry/${encodeURIComponent(categoryCode)}` : `/api/private/catalog/categories/${encodeURIComponent(categoryCode)}/attributes`;
    void fetch(path, { credentials: "same-origin" }).then(async (response) => {
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) throw new Error(await detail(response));
      const schema = categorySource === "registry"
        ? registryAttributes((await response.json() as { category: RegistryCategoryDetail }).category)
        : legacyAttributes((await response.json() as { attributes: LegacyAttribute[] }).attributes);
      if (!cancelled) {
        setAttributes(schema);
        const sameCategory = product && initialSource === categorySource && initialCode === categoryCode;
        setAttributeValues(defaultValues(schema, sameCategory ? product.attributes : undefined));
      }
    }).catch((reason: unknown) => {
      if (!cancelled) setAttributeError(reason instanceof Error ? reason.message : "Les attributs de la catégorie sont indisponibles.");
    }).finally(() => {
      if (!cancelled) setAttributesLoading(false);
    });
    return () => { cancelled = true; };
  }, [categoryCode, categorySource, initialCode, initialSource, product, router]);

  function selectCategory(source: CategorySource, code: string) {
    if (source === categorySource && code === categoryCode) return;
    const hasValues = Object.values(attributeValues).some((value) => Array.isArray(value) ? value.length > 0 : value !== "" && value !== "false") || Boolean(product && Object.keys(product.attributes).length);
    if (hasValues && !window.confirm("Changer de catégorie supprimera du formulaire les caractéristiques incompatibles. Continuer ?")) return;
    setCategorySource(source);
    setCategoryCode(code);
    setAttributes([]);
    setAttributeValues({});
    setFieldErrors({});
    setAttributeError(null);
    setAttributesLoading(true);
  }

  async function submit(form: HTMLFormElement) {
    setError(null);
    setFieldErrors({});
    if (!categoryCode) return setError("Choisissez une catégorie.");
    const selectedUnit = String(new FormData(form).get("unit_of_measure") ?? "");
    if (!selectedUnit) return setError("Choisissez une unité de mesure.");
    const normalized = normalizeProductAttributes(attributes, attributeValues);
    if (Object.keys(normalized.errors).length) {
      setFieldErrors(normalized.errors);
      setError("Corrigez les caractéristiques signalées avant d’enregistrer.");
      return;
    }
    setSaving(true);
    const fields = new FormData(form);
    const sameCategory = product && initialSource === categorySource && initialCode === categoryCode;
    const schemaCodes = new Set(attributes.map((attribute) => attribute.code));
    const preservedUnknownAttributes = sameCategory
      ? Object.fromEntries(Object.entries(product.attributes).filter(([code]) => !schemaCodes.has(code)))
      : {};
    const payload = {
      name: fields.get("name"), description: fields.get("description"), ...categoryPayload(categorySource, categoryCode),
      internal_reference: fields.get("internal_reference") || null, barcode: fields.get("barcode") || null, unit_of_measure: selectedUnit,
      min_price: fields.get("min_price"), max_price: fields.get("max_price"), is_negotiable: fields.get("is_negotiable") === "on",
      cost_price: fields.get("cost_price") || null, status: fields.get("status"), attributes: { ...preservedUnknownAttributes, ...normalized.attributes },
    };
    const url = product ? `/api/private/businesses/${businessId}/products/${product.public_id}` : `/api/private/businesses/${businessId}/products`;
    try {
      const response = await fetch(url, { method: product ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(payload) });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) {
        const problem = await readProblem(response);
        const dynamicErrors = Object.fromEntries(attributes.flatMap((attribute) => {
          const direct = problem.errors[attribute.code]?.[0];
          const nested = problem.errors.attributes?.find((message) => message.includes(attribute.code));
          return direct || nested ? [[attribute.code, direct ?? nested]] : [];
        }));
        setFieldErrors(dynamicErrors);
        setError(problem.detail);
        return;
      }
      onSaved((await response.json() as { product: Product }).product);
    } catch {
      setError("Le catalogue est temporairement indisponible.");
    } finally {
      setSaving(false);
    }
  }

  const commonAttributes = attributes.filter((attribute) => !attribute.variant && ["brand", "model"].includes(attribute.code));
  const specificAttributes = attributes.filter((attribute) => !attribute.variant && !["brand", "model"].includes(attribute.code));
  const variantAttributes = attributes.filter((attribute) => attribute.variant);

  return <form aria-busy={saving} className="grid gap-5 p-1" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
      <legend className="px-2 font-semibold text-[var(--brand-secondary)]">Informations générales</legend>
      <div><label className="text-sm font-medium" htmlFor="product-name">Nom *</label><input className="mt-1 w-full rounded border p-2" defaultValue={product?.name} id="product-name" name="name" required /></div>
      <div className="sm:col-span-2"><CategorySelector choices={choices} disabled={saving} loading={categoriesLoading} onChange={selectCategory} value={categoryCode ? `${categorySource}:${categoryCode}` : ""} /></div>
      <div><label className="text-sm font-medium" htmlFor="product-unit">{t("catalog", "unit")} *</label>{unitsLoading ? <p className="mt-1 text-sm text-[var(--muted)]">{t("feedback", "loading")}</p> : units.length ? <select className="mt-1 w-full rounded border p-2" defaultValue={product?.unit_of_measure ?? "PCS"} id="product-unit" name="unit_of_measure" required>{units.map((unit) => <option key={unit.code} value={unit.code}>{unitLabel(locale, unit.code, unit.name)} ({unit.symbol})</option>)}</select> : <><input name="unit_of_measure" type="hidden" value={product?.unit_of_measure ?? ""} />{product?.unit_of_measure ? <p className="mt-1 text-sm text-[var(--muted)]">{product.unit_of_measure}{product.unit_symbol ? ` (${product.unit_symbol})` : ""}</p> : <p className="mt-1 text-sm text-[var(--error)]" role="alert">{t("catalog", "catalogUnavailable")}</p>}{unitsError ? <button className="mt-2 text-sm underline" onClick={onRetryUnits} type="button">{t("common", "retry")}</button> : null}</>}</div>
      {commonAttributes.map((attribute) => <DynamicAttributeField attribute={attribute} error={fieldErrors[attribute.code]} key={attribute.code} onChange={(value) => setAttributeValues((current) => ({ ...current, [attribute.code]: value }))} value={attributeValues[attribute.code]} />)}
      <div><label className="text-sm font-medium" htmlFor="product-barcode">Code-barres</label><input className="mt-1 w-full rounded border p-2" defaultValue={product?.barcode ?? ""} id="product-barcode" name="barcode" /></div>
      <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="product-description">Description</label><textarea className="mt-1 min-h-24 w-full rounded border p-2" defaultValue={product?.description} id="product-description" name="description" /></div>
    </fieldset>
    {attributeError ? <p className="text-sm text-[var(--error)]" role="alert">{attributeError}</p> : null}
    {attributesLoading ? <p className="text-sm text-[var(--muted)]" role="status">Chargement des caractéristiques de la catégorie…</p> : null}
    {!attributesLoading && categoryCode ? <AttributeSection attributes={specificAttributes} errors={fieldErrors} legend="Caractéristiques spécifiques" onChange={(code, value) => setAttributeValues((current) => ({ ...current, [code]: value }))} values={attributeValues} /> : null}
    {variantAttributes.length ? <section aria-labelledby="variant-axes-title" className="rounded-lg border border-dashed p-4"><h3 className="font-semibold text-[var(--brand-secondary)]" id="variant-axes-title">Axes de variantes</h3><p className="mt-1 text-sm text-[var(--muted)]">Ces valeurs se renseignent lors de la création explicite d’une variante et ne sont pas enregistrées comme caractéristiques communes.</p><ul className="mt-2 list-inside list-disc text-sm">{variantAttributes.map((attribute) => <li key={attribute.code}>{attribute.label}</li>)}</ul></section> : null}
    <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
      <legend className="px-2 font-semibold text-[var(--brand-secondary)]">Informations commerciales</legend>
      <div><label className="text-sm font-medium" htmlFor="product-min-price">Prix minimum *</label><input className="mt-1 w-full rounded border p-2" defaultValue={minimumPreview} id="product-min-price" min="0" name="min_price" onChange={(event) => setMinimumPreview(event.target.value)} required step="0.01" type="number" /></div>
      <div><label className="text-sm font-medium" htmlFor="product-max-price">Prix maximum *</label><input className="mt-1 w-full rounded border p-2" defaultValue={maximumPreview} id="product-max-price" min="0" name="max_price" onChange={(event) => setMaximumPreview(event.target.value)} required step="0.01" type="number" /></div>
      <p className="sm:col-span-2 text-sm text-[var(--muted)]">Devise de l’entreprise : {businessCurrency}</p>
      {minimumPreview && maximumPreview ? <p className="sm:col-span-2 text-sm text-[var(--muted)]">Fourchette affichée : {formatPriceRange(minimumPreview, maximumPreview, businessCurrency)}</p> : null}
      <label className="flex items-center gap-2 text-sm"><input defaultChecked={product?.is_negotiable ?? false} name="is_negotiable" type="checkbox" />Prix négociable</label>
      <div><label className="text-sm font-medium" htmlFor="product-cost-price">Prix de revient</label><input className="mt-1 w-full rounded border p-2" defaultValue={product?.cost_price ?? ""} id="product-cost-price" min="0" name="cost_price" step="0.01" type="number" /></div>
      <div><label className="text-sm font-medium" htmlFor="product-reference">Référence interne</label><input className="mt-1 w-full rounded border p-2" defaultValue={product?.internal_reference ?? ""} id="product-reference" name="internal_reference" /></div>
      <div><label className="text-sm font-medium" htmlFor="product-status">Statut</label><select className="mt-1 w-full rounded border p-2" defaultValue={product?.status ?? "ACTIVE"} id="product-status" name="status"><option value="ACTIVE">Actif</option><option value="INACTIVE">Inactif</option><option value="ARCHIVED">Archivé</option></select></div>
    </fieldset>
    <p className="text-xs text-[var(--muted)]">Le stock et les variantes restent gérés par leurs actions dédiées. Aucun stock ni aucune variante n’est créé automatiquement.</p>
    <button className="button button-primary w-fit" disabled={saving || categoriesLoading || attributesLoading || Boolean(attributeError) || !categoryCode || (!product && (unitsLoading || !units.length))} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button>
  </form>;
}

export function ProductWorkspace({ businessId, productId }: { businessId: string; productId?: string }) {
  const permissions = useBusinessPermissions(businessId);
  const canViewProducts = permissions?.includes("PRODUCT_VIEW") ?? false;
  const canDeleteProduct = permissions?.includes("PRODUCT_DELETE") ?? false;
  return <>{productId ? canViewProducts ? <ProductCatalog businessId={businessId} productId={productId} /> : null : <ProductCatalog businessId={businessId} />}<ProductDeleteAction allowed={canDeleteProduct} businessId={businessId} productId={productId} /></>;
}

function ProductDeleteAction({ allowed, businessId, productId }: { allowed: boolean; businessId: string; productId?: string }) {
  const router = useRouter();
  const [target, setTarget] = useState(productId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  async function removeProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const productPublicId = productId ?? target.trim();
    if (!productPublicId || saving || !window.confirm("Supprimer ce produit s’il n’est référencé par aucune opération ?")) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/products/${encodeURIComponent(productPublicId)}`, { method: "DELETE", credentials: "same-origin", headers: { "x-csrf-protection": "1" } });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      setSuccess("Produit supprimé.");
      if (productId) router.replace(`/espace/entreprises/${businessId}/produits`); else setTarget("");
    } catch { setError("La suppression du produit a échoué."); } finally { setSaving(false); }
  }
  if (!allowed) return null;
  return <section className="content-panel mt-6 grid gap-3 p-5"><h2 className="font-semibold">{productId ? "Supprimer ce produit" : "Supprimer un produit"}</h2><p className="text-sm text-[var(--muted)]">L’action est limitée à un identifiant connu. Un produit référencé ne peut pas être supprimé.</p>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}{success ? <p className="text-sm text-green-800" role="status">{success}</p> : null}<form className="flex flex-wrap items-end gap-3" onSubmit={(event) => void removeProduct(event)}>{!productId ? <label className="grid gap-1 text-sm">Identifiant du produit<input autoComplete="off" className="rounded border p-2" onChange={(event) => setTarget(event.target.value)} required value={target} /></label> : null}<button className="button button-outline" disabled={saving || !allowed} type="submit">{saving ? "Suppression…" : "Supprimer"}</button></form></section>;
}

function positivePage(value: string | null) {
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
}

export function ProductCatalog({ businessId, productId }: { businessId: string; productId?: string }) {
  const searchParams = useSearchParams();
  return <ProductCatalogContent businessId={businessId} key={`${productId ?? "catalog"}:${searchParams}`} productId={productId} searchParams={searchParams} />;
}

function ProductCatalogContent({ businessId, productId, searchParams }: { businessId: string; productId?: string; searchParams: ReadonlyURLSearchParams }) {
  const { t } = useLocale();
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const canViewProducts = permissions?.includes("PRODUCT_VIEW") ?? false;
  const canCreateProduct = permissions?.includes("PRODUCT_CREATE") ?? false;
  const canUpdateProduct = permissions?.includes("PRODUCT_UPDATE") ?? false;
  const [products, setProducts] = useState<Product[] | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [legacyCategories, setLegacyCategories] = useState<LegacyCategory[]>([]);
  const [registryCategories, setRegistryCategories] = useState<RegistryCategorySummary[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState(false);
  const [unitsReload, setUnitsReload] = useState(0);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [businessCurrency, setBusinessCurrency] = useState("CDF");
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const filterCategories = useMemo(() => [...registryCategories.map((item) => ({ code: item.code, label: item.label, source: "registry" as const })), ...legacyCategories.map((item) => ({ code: item.code, label: item.name, source: "legacy" as const }))], [legacyCategories, registryCategories]);
  const page = positivePage(searchParams.get("page"));
  const totalPages = Math.max(1, Math.ceil(totalProducts / 10));
  const visiblePages = [...new Set([1, page - 1, page, page + 1, totalPages].filter((value) => value >= 1 && value <= totalPages))].sort((left, right) => left - right);

  function catalogUrl(nextPage = page, values = { search, status, category }) {
    const query = new URLSearchParams();
    if (values.search) query.set("search", values.search);
    if (values.status) query.set("status", values.status);
    if (values.category) query.set("category", values.category);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return `/espace/entreprises/${businessId}/produits${suffix ? `?${suffix}` : ""}`;
  }

  async function load() {
    router.push(catalogUrl(1));
  }

  useEffect(() => {
    if (!canViewProducts && !canCreateProduct) return;
    let cancelled = false;
    async function syncCatalog() {
      setCategoriesLoading(true);
      try {
        const query = new URLSearchParams(searchParams);
        query.set("page", String(page));
        const requests = [fetch("/api/private/catalog/categories", { credentials: "same-origin" }), fetch("/api/private/catalog/registry", { credentials: "same-origin" }), fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin" }), ...(canViewProducts ? [fetch(`/api/private/businesses/${businessId}/products?${query}`, { credentials: "same-origin" })] : [])];
        const [legacyResponse, registryResponse, businessResponse, productsResponse] = await Promise.all(requests);
        if ([legacyResponse, registryResponse, businessResponse, productsResponse].some((response) => response?.status === 401)) return router.replace("/connexion?erreur=session_expired");
        if (!legacyResponse.ok) throw new Error(await detail(legacyResponse));
        if (!registryResponse.ok) throw new Error(await detail(registryResponse));
        if (!businessResponse.ok) throw new Error(await detail(businessResponse));
        if (productsResponse?.status === 404 && page > 1) {
          const recoveryQuery = new URLSearchParams(searchParams);
          if (page === 2) recoveryQuery.delete("page"); else recoveryQuery.set("page", String(page - 1));
          const suffix = recoveryQuery.toString();
          return router.replace(`/espace/entreprises/${businessId}/produits${suffix ? `?${suffix}` : ""}`);
        }
        if (productsResponse && !productsResponse.ok) throw new Error(await detail(productsResponse));
        const legacyData = await legacyResponse.json() as { categories: LegacyCategory[] };
        const registryData = await registryResponse.json() as { categories: RegistryCategorySummary[] };
        const businessData = await businessResponse.json() as { business: { primary_currency: string } };
        const productsData = productsResponse ? await productsResponse.json() as ProductListResponse : null;
        if (!cancelled) { setLegacyCategories(legacyData.categories); setRegistryCategories(registryData.categories); setBusinessCurrency(businessData.business.primary_currency); if (productsData) { setProducts(productsData.products); setTotalProducts(productsData.pagination.count); } }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : t("catalog", "catalogUnavailable")); }
      finally { if (!cancelled) setCategoriesLoading(false); }
    }
    void syncCatalog();
    return () => { cancelled = true; };
  }, [businessId, canCreateProduct, canViewProducts, page, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/private/catalog/units-of-measure", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) throw new Error("Units unavailable");
      const payload = await response.json() as { units?: unknown };
      if (!Array.isArray(payload.units) || !payload.units.every((unit) => typeof unit === "object" && unit !== null && typeof (unit as UnitOfMeasure).code === "string" && typeof (unit as UnitOfMeasure).name === "string" && typeof (unit as UnitOfMeasure).symbol === "string")) throw new Error("Invalid units response");
      if (!cancelled) { setUnits(payload.units as UnitOfMeasure[]); setUnitsError(false); }
    }).catch(() => { if (!cancelled) setUnitsError(true); }).finally(() => { if (!cancelled) setUnitsLoading(false); });
    return () => { cancelled = true; };
  }, [unitsReload]);

  useEffect(() => {
    if (!productId || !canViewProducts) return;
    void fetch(`/api/private/businesses/${businessId}/products/${productId}`, { credentials: "same-origin" }).then(async (response) => {
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      setProduct((await response.json() as { product: Product }).product);
    }).catch(() => setError(t("catalog", "catalogUnavailable")));
  }, [businessId, productId, router, canViewProducts, t]);

  if (productId) return <main>
    <Link className="text-sm underline" href={`/espace/entreprises/${businessId}/produits`}>← {t("catalog", "backProducts")}</Link>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">{t("catalog", "eyebrow")}</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">{t("catalog", "product")}</h1></div>{product && canUpdateProduct ? <button className="button button-primary" onClick={() => setEditOpen(true)} type="button">{t("catalog", "editProduct")}</button> : null}</div>
    {error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}
    {success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}
    {!product && !error ? <p className="mt-6">{t("feedback", "loading")}</p> : null}
    {product ? <><section className="content-panel mt-6 grid gap-3 p-5"><h2 className="text-xl font-semibold">{product.name}</h2><p className="text-[var(--muted)]">{product.category_name}</p><p>{priceRange(product)}{product.is_negotiable ? ` · ${t("catalog", "negotiable")}` : ""}</p><p className="text-sm">{t("catalog", product.status.toLowerCase())}{product.internal_reference ? ` · ${product.internal_reference}` : ""}</p>{product.description ? <p className="whitespace-pre-wrap">{product.description}</p> : null}</section><ProductMediaManager businessId={businessId} productId={product.public_id} /></> : null}
    {editOpen && product ? <Modal onClose={() => setEditOpen(false)} size="large" title={t("catalog", "editProduct")}><ProductForm businessCurrency={businessCurrency} businessId={businessId} categoriesLoading={categoriesLoading} legacyCategories={legacyCategories} onRetryUnits={() => { setUnitsLoading(true); setUnitsError(false); setUnitsReload((value) => value + 1); }} onSaved={(saved) => { setProduct(saved); setEditOpen(false); setSuccess(t("catalog", "productUpdated")); }} product={product} registryCategories={registryCategories} units={units} unitsError={unitsError} unitsLoading={unitsLoading} /></Modal> : null}
  </main>;

  return <main><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">{t("catalog", "eyebrow")}</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">{t("catalog", "products")}</h1></div><div className="flex flex-wrap items-center gap-3">{canViewProducts ? <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}><input aria-label={t("catalog", "searchProduct")} className="rounded border p-2" onChange={(event) => setSearch(event.target.value)} placeholder={t("catalog", "searchByName")} value={search} /><select aria-label={t("catalog", "filterStatus")} className="rounded border p-2" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">{t("catalog", "allStatuses")}</option><option value="ACTIVE">{t("catalog", "active")}</option><option value="INACTIVE">{t("catalog", "inactive")}</option><option value="ARCHIVED">{t("catalog", "archived")}</option></select><select aria-label={t("catalog", "filterCategory")} className="rounded border p-2" onChange={(event) => setCategory(event.target.value)} value={category}><option value="">{t("catalog", "allCategories")}</option>{filterCategories.map((item) => <option key={`${item.source}:${item.code}`} value={item.code}>{item.label}</option>)}</select><button className="button button-outline" type="submit">{t("catalog", "filter")}</button></form> : null}{canCreateProduct ? <button className="button button-primary" onClick={() => setCreateOpen(true)} type="button">{t("catalog", "addProduct")}</button> : null}</div></div>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}{canViewProducts ? <section className="content-panel mt-6 p-5"><h2 className="font-semibold">{t("catalog", "companyProducts")}</h2>{products === null ? <p className="mt-3">{t("feedback", "loading")}</p> : products.length ? <><ul className="mt-3 divide-y">{products.map((item) => <li className="flex items-center gap-3 py-3" key={item.public_id}><ProductThumbnail product={item} /><div className="min-w-0"><Link className="font-medium underline" href={`/espace/entreprises/${businessId}/produits/${item.public_id}`}>{item.name}</Link><p className="text-sm text-[var(--muted)]">{priceRange(item)}{item.is_negotiable ? ` · ${t("catalog", "negotiable")}` : ""} · {t("catalog", item.status.toLowerCase())}{item.internal_reference ? ` · ${item.internal_reference}` : ""}</p></div></li>)}</ul><nav aria-label={t("catalog", "products")} className="mt-5 flex flex-wrap items-center gap-1.5 md:gap-2"><p className="basis-full text-sm text-[var(--muted)] md:mr-auto md:basis-auto">{formatMessage(t("catalog", "pagination"), { first: (page - 1) * 10 + 1, last: (page - 1) * 10 + products.length, total: totalProducts })}</p><button aria-label={t("catalog", "pagePrevious")} className="button button-outline min-w-10 px-2" disabled={page === 1} onClick={() => router.push(catalogUrl(page - 1))} type="button">←</button>{visiblePages.map((number) => <button aria-current={number === page ? "page" : undefined} className="button button-outline hidden min-w-10 px-2 md:inline-flex" disabled={number === page} key={number} onClick={() => router.push(catalogUrl(number))} type="button">{number}</button>)}<span aria-live="polite" className="min-w-14 text-center text-xs text-[var(--muted)] md:text-sm">{page} / {totalPages}</span><button aria-label={t("catalog", "pageNext")} className="button button-outline min-w-10 px-2" disabled={page >= totalPages} onClick={() => router.push(catalogUrl(page + 1))} type="button">→</button></nav></> : <p className="mt-3 text-sm">{t("catalog", "noProducts")}</p>}</section> : <p className="content-panel mt-6 p-5 text-sm">{t("catalog", "notAllowed")}</p>}{createOpen ? <Modal onClose={() => setCreateOpen(false)} size="large" title={t("catalog", "addProduct")}><ProductForm businessCurrency={businessCurrency} businessId={businessId} categoriesLoading={categoriesLoading} legacyCategories={legacyCategories} onRetryUnits={() => { setUnitsLoading(true); setUnitsError(false); setUnitsReload((value) => value + 1); }} onSaved={() => { setCreateOpen(false); setSuccess("Produit ajouté."); if (canViewProducts) router.push(catalogUrl(1)); }} registryCategories={registryCategories} units={units} unitsError={unitsError} unitsLoading={unitsLoading} /></Modal> : null}</main>;
}
