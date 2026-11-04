import { PointAccount, PointLedgerEntry, PointsRedeemResult, PointsSummary } from "@/types/points"

const API_BASE = "/.netlify/functions"

function parsePointAccount(data: any): PointAccount | null {
  if (!data) return null
  return {
    ...data,
    updatedAt: new Date(data.updatedAt),
  }
}

function parseLedgerEntry(data: any): PointLedgerEntry {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
  }
}

export const getPointsSummary = async (userId: string, limit = 20): Promise<PointsSummary> => {
  const response = await fetch(
    `${API_BASE}/points?userId=${encodeURIComponent(userId)}&action=summary&limit=${Math.max(limit, 1)}`,
    {
      method: "GET",
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `获取积分摘要失败 (${response.status})`)
  }

  const data = await response.json()
  return {
    account: parsePointAccount(data.account),
    ledger: (data.ledger || []).map(parseLedgerEntry),
    todayEarned: Number(data.todayEarned || 0),
    accountInfo: data.accountInfo,
  }
}

export const getPointsBalance = async (userId: string): Promise<PointAccount | null> => {
  const response = await fetch(
    `${API_BASE}/points?userId=${encodeURIComponent(userId)}&action=balance`,
    {
      method: "GET",
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `获取积分余额失败 (${response.status})`)
  }

  const data = await response.json()
  return parsePointAccount(data.account)
}

export const getPointsHistory = async (userId: string, limit = 30): Promise<PointLedgerEntry[]> => {
  const response = await fetch(`${API_BASE}/points`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      action: "history",
      limit: Math.max(limit, 1),
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `获取积分流水失败 (${response.status})`)
  }

  const data = await response.json()
  return (data.ledger || []).map(parseLedgerEntry)
}

export const createRedeemOrder = async (
  userId: string,
  itemCode: string,
  pointCost: number,
  orderNo?: string
): Promise<PointsRedeemResult> => {
  const response = await fetch(`${API_BASE}/points`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      action: "redeem",
      itemCode,
      pointCost,
      orderNo,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `兑换失败 (${response.status})`)
  }

  return response.json()
}

