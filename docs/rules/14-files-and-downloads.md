# Files & Downloads

> Read this before you make the browser save something.
> Last verified against the code: 19 Aug 2026.

Guardrail: [`../../CLAUDE.md`](../../CLAUDE.md) §14.

---

## 1. What & why

Downloads go through `@/lib/utilities`. Never build an `<a download>` by hand.

There are four things to get right and none of them are obvious: the anchor has to be in
the document to click reliably, the object URL must be revoked but **not before Safari has
started the transfer**, the `rel` matters, and a presigned storage URL cannot be fetched
with `fetch` at all because of CORS. Getting one wrong produces a download that works on
your machine and silently does nothing on the customer's.

## 2. The rules

- Use `downloadApiFile` for a file the API generates, `downloadExternalUrl` for a presigned
  or external URL, `downloadBlob` for something already in memory.
- Never construct an `<a download>` at a call site.
- **A filename the server sent is what the recipient expects to see — pass it through
  untouched.** `safeFilename` is only for a name you build yourself.
- Binary responses go through `apiClient.downloadBlob` / `postBlob` so they get the same
  auth handling as everything else. A raw `fetch` skips the refresh-and-retry.
- Uploads go through `apiClient.upload(path, formData)`.

## 3. How it works here

| Function | Use for |
|---|---|
| `downloadApiFile(path, filename)` | A report or document the API renders. Fetches through `apiClient` (so auth is handled), then saves. |
| `downloadExternalUrl(url)` | A presigned storage URL. Navigates rather than fetches — **not subject to CORS**, which is the point. The server must send `Content-Disposition: attachment`. |
| `downloadBlob(blob, filename)` | Something built client-side, e.g. a CSV assembled in the browser. |
| `safeFilename(name)` | Sanitising a name **you** built from user input. |

```ts
await downloadApiFile(`/api/v1/orders/${id}/pdf`, `order-${order.orderNumber}.pdf`);
```

The CSP in `next.config.ts` permits `blob:` in `frame-src` and `media-src`, so a generated
PDF can be previewed in an iframe. Without that the pane shows "content blocked" and
nothing in the console points at the CSP.

## 4. Deliberately not done

| Not done | Why |
|---|---|
| **No client-side PDF library** | Documents are rendered server-side, where the fonts, the letterhead and the totals are the same ones the backend already trusts. A second renderer in the browser drifts from the first, and the customer's copy is the one that matters. |
| **No caching or renaming of downloaded documents** | The filename is what the recipient receives. Mangling it to be "tidier" makes a shared link's file not match what was discussed. |
| **`connect-src` stays `'self'`** | Every API call is same-origin, and downloads use navigation rather than XHR. If you ever add a direct XHR to storage, widen it deliberately. |

## 5. New module checklist

1. Add the download thunk to `api.ts`, using `apiClient.downloadBlob`.
2. Call `downloadApiFile` from the component — no anchors.
3. Use the server's filename where there is one.
4. If the file is served from storage, use `downloadExternalUrl`.

## 6. How to re-check this doc

```bash
# Hand-built download anchors. Expect only lib/utilities/download.ts.
grep -rn "\.download = \|createObjectURL" src/ | grep -v "lib/utilities/download.ts"
```

```bash
# Raw fetch for a binary. Expect zero.
grep -rn "\.blob()" src/ | grep -v "src/lib/api-client.ts"
```
