export function getAdminFlash(url: URL) {
  const message = url.searchParams.get("message");
  const tone = url.searchParams.get("tone") === "error" ? "error" : "success";

  if (!message) return null;

  return { message, tone };
}
