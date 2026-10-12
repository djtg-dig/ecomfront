"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { code: string; name: string };
type Status = "ACTIVE" | "INACTIVE" | "ARCHIVED";
type Product = {
  public_id: string;
  name: string;
  description: string;
  category: string;
  category_name: string;
  internal_reference: string | null;
  barcode: string | null;
  selling_price: string;
  cost_price: string | null;
  currency: "CDF" | "USD";
  attributes: Record<string, unknown>;
  status: Status;
};
type Attribute = {
  code: string;
  name: string;
  data_type: "TEXT" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "DATE" | "CHOICE";
  is_required: boolean;
  is_variant_axis: boolean;
  options?: { value: string; label: string }[];
};

async function detail(response: Response) {
  try {
    return (await response.json() as { detail?: string }).detail ?? "Le catalogue est indisponible.";
  } catch {
    return "Le catalogue est indisponible.";
  }
}

function stringifyAttribute(value: unknown) {
  return typeof value === "boolean" ? String(value) : value == null ? "" : String(value);
}

function AttributeFields({ attributes, values, onChange }: {
  attributes: Attribute[];
  values: Record<string, string>;
  onChange: (code: string, value: string) => void;
}) {
  const productAttributes = attributes.filter((attribute) => !attribute.is_variant_axis);
  if (!productAttributes.length) return null;

  return <fieldset className="grid gap-3 border-t pt-3">
    <legend className="font-medium">Attributs de la catégorie</legend>
    {productAttributes.map((attribute) => {
      const common = {
        className: "mt-1 w-full rounded border p-2",
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(attribute.code, event.target.value),
        required: attribute.is_required,
        value: values[attribute.code] ?? "",
      };
      return <label key={attribute.code}>
        {attribute.name}{attribute.is_required ? " *" : ""}
        {attribute.data_type === "CHOICE" ? <select {...common}><option value="">Choisir</option>{attribute.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : null}
        {attribute.data_type === "BOOLEAN" ? <select {...common}><option value="">Choisir</option><option value="true">Oui</option><option value="false">Non</option></select> : null}
        {attribute.data_type !== "CHOICE" && attribute.data_type !== "BOOLEAN" ? <input {...common} step={attribute.data_type === "DECIMAL" ? "any" : undefined} type={attribute.data_type === "DATE" ? "date" : attribute.data_type === "INTEGER" || attribute.data_type === "DECIMAL" ? "number" : "text"} /> : null}
      </label>;
    })}
  </fieldset>;
}

function ProductForm({ businessId, product, categories, onSaved }: {
  businessId: string;
  product?: Product;
  categories: Category[];
  onSaved: (product: Product) => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(product?.category ?? "");
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [attributeError, setAttributeError] = useState<string | null>(null);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!category) {
      setAttributes([]);
      setAttributeValues({});
      return;
    }
    let cancelled = false;
    setAttributeError(null);
    setAttributesLoading(true);
    void fetch(`/api/private/catalog/categories/${category}/attributes`, { credentials: "same-origin" }).then(async (response) => {
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) throw new Error(await detail(response));
      const result = await response.json() as { attributes: Attribute[] };
      if (!cancelled) {
        setAttributes(result.attributes);
        setAttributeValues(Object.fromEntries(Object.entries(product?.category === category ? product.attributes : {}).map(([key, value]) => [key, stringifyAttribute(value)])));
      }
    }).catch((reason: unknown) => {
      if (!cancelled) setAttributeError(reason instanceof Error ? reason.message : "Les attributs de la catégorie sont indisponibles.");
    }).finally(() => {
      if (!cancelled) setAttributesLoading(false);
    });
    return () => { cancelled = true; };
  }, [category, product?.attributes, product?.category, router]);

  async function submit(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const fields = new FormData(form);
    const normalizedEntries: [string, unknown][] = [];
    for (const attribute of attributes.filter((item) => !item.is_variant_axis)) {
      const value = attributeValues[attribute.code];
      if (value === undefined || value === "") continue;
      normalizedEntries.push([attribute.code, attribute.data_type === "INTEGER" ? Number(value) : attribute.data_type === "BOOLEAN" ? value === "true" : value]);
    }
    const normalizedAttributes = Object.fromEntries(normalizedEntries);
    const payload = {
      name: fields.get("name"), description: fields.get("description"), category,
      internal_reference: fields.get("internal_reference") || null, barcode: fields.get("barcode") || null,
      selling_price: fields.get("selling_price"), cost_price: fields.get("cost_price") || null,
      currency: fields.get("currency"), status: fields.get("status"), attributes: normalizedAttributes,
    };
    const url = product ? `/api/private/businesses/${businessId}/products/${product.public_id}` : `/api/private/businesses/${businessId}/products`;
    const response = await fetch(url, { method: product ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await detail(response));
    onSaved((await response.json() as { product: Product }).product);
  }

  return <form className="content-panel grid gap-3 p-5" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <h2 className="font-semibold">{product ? "Modifier le produit" : "Créer un produit"}</h2>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <label>Nom<input className="mt-1 w-full rounded border p-2" defaultValue={product?.name} name="name" required /></label>
    <label>Catégorie<select className="mt-1 w-full rounded border p-2" name="category" onChange={(event) => setCategory(event.target.value)} required value={category}><option value="">Choisir</option>{categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
    {attributeError ? <p className="text-sm text-[var(--error)]" role="alert">{attributeError}</p> : null}
    {attributesLoading ? <p className="text-sm text-[var(--muted)]">Chargement des attributs de la catégorie…</p> : null}
    <AttributeFields attributes={attributes} onChange={(code, value) => setAttributeValues((current) => ({ ...current, [code]: value }))} values={attributeValues} />
    <label>Prix de vente<input className="mt-1 w-full rounded border p-2" defaultValue={product?.selling_price} min="0" name="selling_price" required step="0.01" type="number" /></label>
    <label>Devise<select className="mt-1 w-full rounded border p-2" defaultValue={product?.currency ?? "CDF"} name="currency"><option value="CDF">CDF</option><option value="USD">USD</option></select></label>
    <label>Référence interne<input className="mt-1 w-full rounded border p-2" defaultValue={product?.internal_reference ?? ""} name="internal_reference" /></label>
    <label>Code-barres<input className="mt-1 w-full rounded border p-2" defaultValue={product?.barcode ?? ""} name="barcode" /></label>
    <label>Prix de revient<input className="mt-1 w-full rounded border p-2" defaultValue={product?.cost_price ?? ""} min="0" name="cost_price" step="0.01" type="number" /></label>
    <label>Statut<select className="mt-1 w-full rounded border p-2" defaultValue={product?.status ?? "ACTIVE"} name="status"><option value="ACTIVE">Actif</option><option value="INACTIVE">Inactif</option><option value="ARCHIVED">Archivé</option></select></label>
    <label>Description<textarea className="mt-1 w-full rounded border p-2" defaultValue={product?.description} name="description" /></label>
    <p className="text-xs text-[var(--muted)]">Les axes de variantes ne sont pas des attributs de produit : ils restent réservés aux variantes du produit.</p>
    <button className="button button-primary w-fit" disabled={saving || Boolean(attributeError)} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button>
  </form>;
}

export function ProductCatalog({ businessId, productId }: { businessId: string; productId?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  async function load() {
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (category) query.set("category", category);
      const [list, taxonomy] = await Promise.all([
        fetch(`/api/private/businesses/${businessId}/products?${query}`, { credentials: "same-origin" }),
        fetch("/api/private/catalog/categories", { credentials: "same-origin" }),
      ]);
      if (list.status === 401 || taxonomy.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!list.ok) return setError(await detail(list));
      if (!taxonomy.ok) return setError(await detail(taxonomy));
      setProducts((await list.json() as { products: Product[] }).products);
      setCategories((await taxonomy.json() as { categories: Category[] }).categories);
    } catch {
      setError("Le catalogue est temporairement indisponible.");
    }
  }

  useEffect(() => { void load(); }, [businessId]);
  useEffect(() => {
    if (!productId) return;
    void fetch(`/api/private/businesses/${businessId}/products/${productId}`, { credentials: "same-origin" }).then(async (response) => {
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      setProduct((await response.json() as { product: Product }).product);
    }).catch(() => setError("Le catalogue est temporairement indisponible."));
  }, [businessId, productId, router]);

  if (productId) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/produits`}>← Produits</Link><h1 className="mt-3 text-3xl font-semibold">Produit</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{product ? <ProductForm businessId={businessId} categories={categories} onSaved={setProduct} product={product} /> : !error ? <p className="mt-5">Chargement du produit…</p> : null}</main>;
  return <main><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">CATALOGUE</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Produits</h1></div><form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void load(); }}><input className="rounded border p-2" onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par nom" value={search} /><select className="rounded border p-2" onChange={(event) => setStatus(event.target.value)} value={status}><option value="">Tous les statuts</option><option value="ACTIVE">Actifs</option><option value="INACTIVE">Inactifs</option><option value="ARCHIVED">Archivés</option></select><select className="rounded border p-2" onChange={(event) => setCategory(event.target.value)} value={category}><option value="">Toutes les catégories</option>{categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><button className="button button-outline" type="submit">Filtrer</button></form></div>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}<div className="mt-6 grid gap-6 lg:grid-cols-2"><ProductForm businessId={businessId} categories={categories} onSaved={(created) => { setProducts((current) => current ? [...current, created] : [created]); router.push(`/espace/entreprises/${businessId}/produits/${created.public_id}`); }} /><section className="content-panel p-5"><h2 className="font-semibold">Produits de l’entreprise</h2>{products === null ? <p className="mt-3">Chargement…</p> : products.length ? <ul className="mt-3 divide-y">{products.map((item) => <li className="py-3" key={item.public_id}><Link className="font-medium underline" href={`/espace/entreprises/${businessId}/produits/${item.public_id}`}>{item.name}</Link><p className="text-sm text-[var(--muted)]">{item.selling_price} {item.currency} · {item.status}{item.internal_reference ? ` · ${item.internal_reference}` : ""}</p></li>)}</ul> : <p className="mt-3 text-sm">Aucun produit ne correspond aux filtres.</p>}</section></div></main>;
}
