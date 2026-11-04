export interface PointAccount {
  userId: string
  balance: number
  totalEarned: number
  totalSpent: number
  status: number
  updatedAt: Date
}

export interface PointLedgerEntry {
  id: string
  userId: string
  bizId: string
  scene: string
  eventType: string
  ruleCode: string
  direction: 1 | 2
  pointDelta: number
  balanceBefore: number
  balanceAfter: number
  ext: Record<string, unknown>
  createdAt: Date
}

export interface PointsAccountInfo {
  userId: string
  userName: string
  employeeNo: string
}

export interface PointsSummary {
  account: PointAccount | null
  ledger: PointLedgerEntry[]
  todayEarned: number
  accountInfo: PointsAccountInfo
}

export interface PointsRedeemResult {
  success: boolean
  message: string
  order_no?: string
  point_cost?: number
  item_code?: string
  balance_after?: number
  error_code?: string
  accountInfo?: PointsAccountInfo
}

