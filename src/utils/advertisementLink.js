// Advertisement destinations are website links shared by every placement.
// Resolve /courses against the public site, not the student dashboard.
export function advertisementLink(value, websiteUrl) {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim(), websiteUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
