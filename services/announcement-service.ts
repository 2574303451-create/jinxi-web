const API_BASE = "/.netlify/functions"

export interface Announcement {
  id: string
  title: string
  contentHtml: string
  author: string
  createdAt: string
  updatedAt?: string
}

interface AnnouncementApiItem {
  id: number | string
  title: string
  contentHtml: string
  author?: string
  createdAt: string
  updatedAt?: string
}

function normalizeAnnouncement(item: AnnouncementApiItem): Announcement {
  return {
    id: String(item.id),
    title: item.title,
    contentHtml: item.contentHtml,
    author: "\u6267\u624b",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

async function parseError(response: Response, fallback: string) {
  try {
    const data = await response.json()
    if (typeof data?.error === "string") {
      return data.error
    }
  } catch {
    // Ignore parse failures and use fallback error.
  }
  return fallback
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const response = await fetch(`${API_BASE}/announcements`, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await parseError(response, `公告加载失败，请重试 (${response.status})`)
    throw new Error(message)
  }

  const data: AnnouncementApiItem[] = await response.json()
  return data.map(normalizeAnnouncement)
}
