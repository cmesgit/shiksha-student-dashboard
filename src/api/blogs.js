// src/api/blogs.js
// ──────────────────────────────────────────────────────────────────────────
// Data layer for the Academy blog feed — GET /content/blogs/, the same
// endpoint the marketing site's /blogs list reads. Resolves to [] on any
// failure so the feed can show its own empty state instead of crashing.
// ──────────────────────────────────────────────────────────────────────────

import api from "./apiClient";

export async function getBlogFeed({ maxPages = 20 } = {}) {
  const posts = [];
  try {
    let url = "/content/blogs/?page_size=24";
    for (let i = 0; i < maxPages && url; i += 1) {
      const { data } = await api.get(url);
      (data.results || []).forEach((p) =>
        posts.push({
          id: p.id,
          slug: p.slug,
          category: p.category || p.subject || "",
          title: p.title,
          subtitle: p.excerpt || undefined,
          thumbnail: p.thumbnail || undefined,
          tags: p.tags || [],
        })
      );
      url = data.next ? data.next.replace(/^.*\/api/, "") : null;
    }
  } catch {
    /* API down — feed shows its own empty state */
  }
  return posts;
}
