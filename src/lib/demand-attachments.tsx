import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "demand_attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * Extract the storage path inside `demand_attachments` from an existing URL.
 * Supports both legacy public URLs and signed URLs.
 */
function extractStoragePath(url: string): string | null {
  const publicMarker = `/storage/v1/object/public/${BUCKET}/`;
  const signMarker = `/storage/v1/object/sign/${BUCKET}/`;
  let idx = url.indexOf(publicMarker);
  let markerLen = publicMarker.length;
  if (idx === -1) {
    idx = url.indexOf(signMarker);
    markerLen = signMarker.length;
  }
  if (idx === -1) return null;
  const rest = url.slice(idx + markerLen);
  // strip query string (e.g. ?token=...)
  return rest.split("?")[0];
}

/**
 * Upload a file to the user's own folder in demand_attachments and return a
 * long-lived signed URL ready to embed in HTML/Markdown content.
 */
export async function uploadDemandAttachment(
  file: File,
  userId: string,
  ext?: string,
): Promise<{ signedUrl: string; path: string }> {
  const fileExt = ext ?? file.name.split(".").pop() ?? "bin";
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const path = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Falha ao gerar URL assinada");
  }
  return { signedUrl: data.signedUrl, path };
}

/**
 * Given an arbitrary text/HTML blob containing demand_attachments URLs
 * (public or expired signed), return the same content with every storage URL
 * replaced by a fresh signed URL.
 */
export async function refreshDemandAttachmentUrls(
  content: string,
): Promise<string> {
  if (!content) return content;
  const urlRegex = /https?:\/\/[^\s"'()<>]+/g;
  const matches = Array.from(new Set(content.match(urlRegex) ?? []));
  const replacements: Array<[string, string]> = [];

  for (const url of matches) {
    const path = extractStoragePath(url);
    if (!path) continue;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (!error && data?.signedUrl) {
      replacements.push([url, data.signedUrl]);
    }
  }

  let out = content;
  for (const [from, to] of replacements) {
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Hook that returns content with demand_attachments URLs refreshed to fresh
 * signed URLs. Returns the original content immediately, then swaps in the
 * refreshed version once available.
 */
export function useRefreshedDemandContent(content: string | null | undefined) {
  const [resolved, setResolved] = useState<string>(content ?? "");
  useEffect(() => {
    let cancelled = false;
    const c = content ?? "";
    setResolved(c);
    if (!c) return;
    refreshDemandAttachmentUrls(c)
      .then((next) => {
        if (!cancelled) setResolved(next);
      })
      .catch(() => {
        /* keep original; broken images will simply fail to load */
      });
    return () => {
      cancelled = true;
    };
  }, [content]);
  return resolved;
}
