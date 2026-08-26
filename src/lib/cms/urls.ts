const BLOCKED_SCHEMES = /^(javascript|data|file|vbscript):/i;

/**
 * Accept only https URLs. Reject dangerous schemes and obvious XSS vectors.
 */
export function isSafeHttpsUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || BLOCKED_SCHEMES.test(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/**
 * Extract a YouTube video id from common URL formats.
 * Returns null when the URL is not a recognized YouTube URL.
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!isSafeHttpsUrl(url)) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = parsed.pathname.replace(/^\//, "").split("/")[0];
    return isValidYoutubeId(id) ? id : null;
  }

  const shorts = parsed.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (shorts?.[1] && isValidYoutubeId(shorts[1])) {
    return shorts[1];
  }

  const embed = parsed.pathname.match(/^\/embed\/([A-Za-z0-9_-]{6,})/);
  if (embed?.[1] && isValidYoutubeId(embed[1])) {
    return embed[1];
  }

  const v = parsed.searchParams.get("v");
  if (v && isValidYoutubeId(v)) {
    return v;
  }

  return null;
}

export function isValidYoutubeId(id: string | null | undefined): boolean {
  if (!id) {
    return false;
  }
  return /^[A-Za-z0-9_-]{6,32}$/.test(id);
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}
