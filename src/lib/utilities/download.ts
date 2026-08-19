/**
 * Browser downloads, in one place.
 *
 * Never build an `<a download>` by hand at a call site. The element has to be in
 * the document to click reliably, the object URL must be revoked but not before
 * Safari has started the transfer, and the `rel` matters. Getting one of those
 * wrong produces a download that works on your machine and silently does nothing
 * on someone else's.
 */

import { apiClient } from "@/lib/api-client";

/** Trigger a browser download for an in-memory Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
    // Revoke on the next tick — Safari needs the URL to still be live when the
    // click is processed, and revoking synchronously cancels the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Fetch a blob through the api client (so it gets the auth handling) and trigger
 * the download in one step.
 */
export async function downloadApiFile(path: string, filename: string): Promise<void> {
  const blob = await apiClient.downloadBlob(path);
  downloadBlob(blob, filename);
}

/**
 * Download by navigating to an external or presigned URL.
 *
 * Unlike `fetch`, browser navigation is not subject to CORS — which is the point:
 * presigned storage URLs usually will not allow an XHR. The server must send
 * `Content-Disposition: attachment` (S3 presign params can set it), or the browser
 * navigates to the file instead of saving it.
 */
export function downloadExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
  }
}

/**
 * Make an arbitrary string safe as a download filename.
 *
 * Only for names you build yourself. A filename the server sent is what the
 * recipient expects to see — pass it through untouched.
 */
export function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_");
}
