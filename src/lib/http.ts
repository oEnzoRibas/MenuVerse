export const privateJson = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export function requestProtocol(request: Request) {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "http" || proto === "https"
    ? proto + ":"
    : new URL(request.url).protocol;
}

export function sameOrigin(request: Request) {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host");
  if (!host || !/^(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d{1,5})?$/i.test(host))
    return false;
  try {
    return (
      request.headers.get("origin") ===
      new URL(requestProtocol(request) + "//" + host).origin
    );
  } catch {
    return false;
  }
}

/** Bounds the streamed body before parsing untrusted JSON. */
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let count = 0;
  let input = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return JSON.parse(input + decoder.decode()) as unknown;
      count += chunk.value.byteLength;
      if (count > 48000) {
        await reader.cancel();
        return null;
      }
      input += decoder.decode(chunk.value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
