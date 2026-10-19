"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type Media = { id: string; media_type: "IMAGE" | "VIDEO"; secure_url: string; is_primary: boolean; position: number; width: number; height: number; duration_seconds: string | null };
type UploadState = "idle" | "selected" | "validating" | "uploading";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const acceptedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const imageHint = "Images JPEG, PNG ou WebP · max. 8 Mo · 800×800 px minimum";
const videoHint = "Vidéos MP4, WebM ou MOV · max. 50 Mo · 60 secondes";

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { detail?: unknown; file?: unknown; media_type?: unknown };
    for (const value of [payload.detail, payload.file, payload.media_type]) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  } catch {
    // A proxy may return a non-JSON 413/502 response.
  }
  return fallback;
}

function validateSelectedVideo(file: File): string | null {
  if (!acceptedVideoTypes.has(file.type)) return "Formats vidéo acceptés : MP4, WebM ou MOV.";
  if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) return "La vidéo doit peser au plus 50 Mo.";
  return null;
}

export function ProductMediaManager({ businessId, productId }: { businessId: string; productId: string }) {
  const permissions = useBusinessPermissions(businessId);
  const allowed = permissions?.includes("PRODUCT_UPDATE") ?? false;
  const [media, setMedia] = useState<Media[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadType, setUploadType] = useState<Media["media_type"] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/private/businesses/${businessId}/products/${productId}/media`, { credentials: "same-origin" });
    if (!response.ok) throw new Error(await responseMessage(response, "Les médias sont indisponibles."));
    const payload = await response.json() as { media?: Media[] };
    setMedia(payload.media ?? []);
  }, [businessId, productId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Les médias sont indisponibles."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function upload(type: Media["media_type"], event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploadType(type); setUploadState("selected"); setNotice(null); setError(null); setBusy(true);
    try {
      setUploadState("validating");
      if (type === "VIDEO") for (const file of files) { const error = validateSelectedVideo(file); if (error) throw new Error(error); }
      setUploadState("uploading");
      const uploaded: Media[] = [];
      for (const file of files) {
        const form = new FormData(); form.set("media_type", type); form.set("file", file);
        const response = await fetch(`/api/private/businesses/${businessId}/products/${productId}/media`, {
          method: "POST", credentials: "same-origin",
          // Deliberately omit Content-Type: the browser supplies the multipart boundary.
          headers: { "x-csrf-protection": "1" }, body: form,
        });
        if (!response.ok) throw new Error(await responseMessage(response, "Le téléversement a échoué. Réessayez."));
        const payload = await response.json() as { media?: Media };
        if (!payload.media || payload.media.media_type !== type || !payload.media.secure_url) throw new Error("Le service a confirmé un téléversement incomplet. Réessayez.");
        uploaded.push(payload.media);
      }
      setMedia((current) => current ? [...current, ...uploaded] : uploaded);
      setNotice(type === "VIDEO" ? "Vidéo ajoutée avec succès." : "Photo ajoutée avec succès.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Le téléversement a échoué. Réessayez."); }
    finally { setBusy(false); setUploadState("idle"); setUploadType(null); event.target.value = ""; }
  }

  async function update(item: Media, payload: Record<string, unknown>, successMessage: string) { setBusy(true); setError(null); setNotice(null); try { const response = await fetch(`/api/private/businesses/${businessId}/products/${productId}/media/${item.id}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(await responseMessage(response, "La mise à jour a échoué.")); await load(); setNotice(successMessage); } catch (reason) { setError(reason instanceof Error ? reason.message : "La mise à jour a échoué."); } finally { setBusy(false); } }
  async function remove(item: Media) { setBusy(true); setError(null); setNotice(null); try { const response = await fetch(`/api/private/businesses/${businessId}/products/${productId}/media/${item.id}`, { method: "DELETE", credentials: "same-origin", headers: { "x-csrf-protection": "1" } }); if (!response.ok) throw new Error(await responseMessage(response, "La suppression a échoué.")); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "La suppression a échoué."); } finally { setBusy(false); } }

  const mediaLabel = uploadType === "VIDEO" ? "vidéo" : "fichier";
  const progressLabel = uploadState === "selected" ? `${mediaLabel[0].toUpperCase()}${mediaLabel.slice(1)} sélectionné${uploadType === "VIDEO" ? "e" : ""}.` : uploadState === "validating" ? `Validation de la ${mediaLabel}…` : uploadState === "uploading" ? "Téléversement en cours…" : null;
  return <section className="content-panel mt-5 grid gap-4 p-5"><div><h2 className="font-semibold">Photos et vidéos</h2><p className="mt-1 text-sm text-[var(--muted)]">Jusqu’à 10 photos, 3 vidéos et 13 médias au total. La miniature principale est toujours une photo.</p></div>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="text-sm text-green-800" role="status">{notice}</p> : null}{progressLabel ? <p aria-busy={busy} className="text-sm text-[var(--muted)]" role="status">{progressLabel}</p> : null}{allowed ? <div className="flex flex-wrap gap-2"><label className="button button-primary cursor-pointer">Ajouter des photos<input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} multiple onChange={(event) => void upload("IMAGE", event)} type="file" /></label><label className="button button-outline cursor-pointer">Ajouter des vidéos<input accept="video/mp4,video/webm,video/quicktime" className="sr-only" disabled={busy} multiple onChange={(event) => void upload("VIDEO", event)} type="file" /></label></div> : null}<p className="text-xs text-[var(--muted)]">{imageHint}<br />{videoHint}</p>{media === null ? <p>Chargement…</p> : media.length === 0 ? <p className="text-sm text-[var(--muted)]">Aucun média. Une image de remplacement sera affichée dans les listes.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{media.map((item, index) => <article className="overflow-hidden rounded border" key={item.id}>{item.media_type === "IMAGE" ? <img alt="Photo produit" className="h-40 w-full object-cover" src={item.secure_url} /> : <video className="h-40 w-full bg-black object-cover" controls preload="metadata" src={item.secure_url} />}<div className="grid gap-2 p-3"><p className="text-sm font-medium">{item.media_type === "IMAGE" ? "Photo" : "Vidéo"} · Position {index + 1}{item.is_primary ? " · Image principale" : ""}</p>{allowed ? <div className="flex flex-wrap gap-2">{item.media_type === "IMAGE" && !item.is_primary ? <button aria-label="Définir comme image principale" className="button button-outline text-sm" disabled={busy} onClick={() => void update(item, { is_primary: true }, "Image principale mise à jour.")} title="Définir comme image principale" type="button">☆</button> : item.is_primary ? <span aria-label="Image principale" title="Image principale">★</span> : null}<button aria-label="Déplacer vers le haut" className="button button-outline text-sm" disabled={busy || index === 0} onClick={() => void update(item, { position: index - 1 }, "Position enregistrée.")} title="Déplacer vers le haut" type="button">↑</button><button aria-label="Déplacer vers le bas" className="button button-outline text-sm" disabled={busy || index === media.length - 1} onClick={() => void update(item, { position: index + 1 }, "Position enregistrée.")} title="Déplacer vers le bas" type="button">↓</button><button aria-label="Supprimer le média" className="button button-outline text-sm" disabled={busy} onClick={() => void remove(item)} title="Supprimer le média" type="button">⌫</button></div> : null}</div></article>)}</div>}</section>;
}
