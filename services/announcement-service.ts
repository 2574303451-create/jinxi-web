const API_BASE = "/.netlify/functions"

export interface Announcement {
  id: string
  title: string
  contentHtml: string
  author: string
  createdAt: string
  updatedAt?: string
}

export interface PostAnnouncementPayload {
  title: string
  contentHtml: string
  author?: string
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
    const message = await parseError(response, `鍔犺浇鍏憡澶辫触 (${response.status})`)
    throw new Error(message)
  }

  const data: AnnouncementApiItem[] = await response.json()
  return data.map(normalizeAnnouncement)
}

export async function postAnnouncement(payload: PostAnnouncementPayload, adminToken: string): Promise<Announcement> {
  const response = await fetch(`${API_BASE}/announcements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      token: adminToken,
    }),
  })

  if (!response.ok) {
    const message = await parseError(response, `鍙戝竷鍏憡澶辫触 (${response.status})`)
    throw new Error(message)
  }

  const data: AnnouncementApiItem = await response.json()
  return normalizeAnnouncement(data)
}

export async function verifyAnnouncementAdminToken(token: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/announcements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "verify",
      token,
    }),
  })

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  return data?.valid === true
}

