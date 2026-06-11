import { withPortalBasePath } from "../portal/base-path";

function getFirstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getForwardedRequestUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = getFirstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = getFirstForwardedValue(request.headers.get("x-forwarded-proto"));

  if (forwardedHost) {
    url.host = forwardedHost;
  }

  if (forwardedProto === "http" || forwardedProto === "https") {
    url.protocol = `${forwardedProto}:`;
  }

  return url;
}

export function createRedirectResponse(location: URL | string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: typeof location === "string" ? location : location.toString()
    }
  });
}

export function redirectWithFlash(
  request: Request,
  pathname: string,
  kind: "error" | "message",
  message: string
) {
  const url = new URL(withPortalBasePath(pathname), getForwardedRequestUrl(request));
  url.searchParams.set(kind, message);
  return createRedirectResponse(url);
}
