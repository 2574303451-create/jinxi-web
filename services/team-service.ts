/**
 * 战队系统服务
 * 使用 LocalStorage 存储战队数据
 */

import { Team, TeamStats, TeamActivity, TeamApplication, TeamRanking, Member } from '../types/team'
import { getUserId, getUserName } from '../lib/user-utils'

const STORAGE_KEY_TEAMS = 'jinxi-teams'
const STORAGE_KEY_USER_TEAM = 'jinxi-user-team-'
const STORAGE_KEY_APPLICATIONS = 'jinxi-team-applications'

// 预定义战队数据
const DEFAULT_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: '今夕·星耀战队',
    icon: '⭐',
    color: '#FFD93D',
    slogan: '星光璀璨，所向披靡',
    leader: {
      id: 'user_1',
      name: '今夕_执手',
      avatar: '/1.png',
      role: '队长',
      level: 85,
      power: 12500,
      joinDate: new Date('2024-01-01'),
    },
    members: [
      {
        id: 'user_2',
        name: '今夕_淡意',
        avatar: '/2.png',
        role: '副队长',
        level: 82,
        power: 11800,
        joinDate: new Date('2024-01-05'),
      },
      {
        id: 'user_3',
        name: '今夕_恐龙',
        avatar: '/3.png',
        role: '队员',
        level: 80,
        power: 11200,
        joinDate: new Date('2024-01-10'),
      },
    ],
    stats: {
      totalPoints: 15800,
      weeklyPoints: 2300,
      rank: 1,
      winRate: 75.5,
      totalBattles: 120,
      wins: 91,
      losses: 25,
      draws: 4,
    },
    activities: [
      {
        id: 'act-1',
        type: 'battle',
        title: '公会战：今夕 vs 明月',
        description: '激烈的公会对抗赛',
        date: new Date('2024-02-08'),
        participants: [],
        result: 'win',
        points: 500,
        rewards: ['战神徽章', '500积分'],
      },
    ],
    createdAt: new Date('2024-01-01'),
    description: '今夕公会最强战队，追求极致配合与战术',
    requirements: '等级70+，战力10000+',
    maxMembers: 10,
  },
  {
    id: 'team-2',
    name: '今夕·月影战队',
    icon: '🌙',
    color: '#6BCFFF',
    slogan: '月影如梦，战无不胜',
    leader: {
      id: 'user_4',
      name: '今夕_朝云去',
      avatar: '/4.png',
      role: '队长',
      level: 78,
      power: 10800,
      joinDate: new Date('2024-01-15'),
    },
    members: [
      {
        id: 'user_5',
        name: '今夕_时光',
        avatar: '/5.png',
        role: '副队长',
        level: 76,
        power: 10200,
        joinDate: new Date('2024-01-20'),
      },
    ],
    stats: {
      totalPoints: 12500,
      weeklyPoints: 1800,
      rank: 2,
      winRate: 68.2,
      totalBattles: 95,
      wins: 65,
      losses: 28,
      draws: 2,
    },
    activities: [
      {
        id: 'act-2',
        type: 'training',
        title: '战术训练：配合演练',
        description: '提升团队配合度',
        date: new Date('2024-02-07'),
        participants: [],
        points: 200,
      },
    ],
    createdAt: new Date('2024-01-15'),
    description: '注重战术配合的精英战队',
    requirements: '等级65+，战力8000+',
    maxMembers: 10,
  },
  {
    id: 'team-3',
    name: '今夕·烈焰战队',
    icon: '🔥',
    color: '#FF6B9D',
    slogan: '烈焰燃烧，热血沸腾',
    leader: {
      id: 'user_6',
      name: '今夕_心安',
      avatar: '/6.png',
      role: '队长',
      level: 75,
      power: 9800,
      joinDate: new Date('2024-02-01'),
    },
    members: [
      {
        id: 'user_7',
        name: '今夕_小夏',
        avatar: '/7.png',
        role: '队员',
        level: 72,
        power: 9200,
        joinDate: new Date('2024-02-05'),
      },
    ],
    stats: {
      totalPoints: 9800,
      weeklyPoints: 1500,
      rank: 3,
      winRate: 62.5,
      totalBattles: 80,
      wins: 50,
      losses: 28,
      draws: 2,
    },
    activities: [
      {
        id: 'act-3',
        type: 'event',
        title: '周年庆典活动',
        description: '参与公会周年庆',
        date: new Date('2024-02-06'),
        participants: [],
        points: 300,
        rewards: ['庆典徽章'],
      },
    ],
    createdAt: new Date('2024-02-01'),
    description: '充满激情的新锐战队',
    requirements: '等级60+，战力7000+',
    maxMembers: 10,
  },
]

/**
 * 获取所有战队
 */
export function getAllTeams(): Team[] {
  if (typeof window === 'undefined') return []

  const saved = localStorage.getItem(STORAGE_KEY_TEAMS)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return DEFAULT_TEAMS
    }
  }

  // 首次加载，保存默认数据
  localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(DEFAULT_TEAMS))
  return DEFAULT_TEAMS
}

/**
 * 获取战队排行榜
 */
export function getTeamRankings(): TeamRanking[] {
  const teams = getAllTeams()

  return teams
    .sort((a, b) => b.stats.weeklyPoints - a.stats.weeklyPoints)
    .map((team, index) => ({
      rank: index + 1,
      team,
      weeklyPoints: team.stats.weeklyPoints,
      trend: index === team.stats.rank - 1 ? 'same' : index < team.stats.rank - 1 ? 'up' : 'down',
      trendChange: Math.abs(index + 1 - team.stats.rank),
    }))
}

/**
 * 获取指定战队
 */
export function getTeamById(teamId: string): Team | null {
  const teams = getAllTeams()
  return teams.find(t => t.id === teamId) || null
}

/**
 * 获取用户所在战队
 */
export function getUserTeam(): Team | null {
  if (typeof window === 'undefined') return null

  const userId = getUserId()
  const teamId = localStorage.getItem(`${STORAGE_KEY_USER_TEAM}${userId}`)

  if (teamId) {
    return getTeamById(teamId)
  }

  return null
}

/**
 * 申请加入战队
 */
export function applyToTeam(teamId: string, message: string): boolean {
  if (typeof window === 'undefined') return false

  const userId = getUserId()
  const userName = getUserName()

  if (!userName) {
    alert('请先设置用户名')
    return false
  }

  // 检查是否已经在战队中
  const currentTeam = getUserTeam()
  if (currentTeam) {
    alert('您已经在战队中，请先退出当前战队')
    return false
  }

  // 检查战队是否存在
  const team = getTeamById(teamId)
  if (!team) {
    alert('战队不存在')
    return false
  }

  // 检查战队是否已满
  if (team.members.length >= team.maxMembers) {
    alert('战队已满员')
    return false
  }

  // 创建申请
  const application: TeamApplication = {
    id: `app_${Date.now()}`,
    userId,
    userName,
    teamId,
    message,
    status: 'pending',
    createdAt: new Date(),
  }

  // 保存申请
  const applications = getApplications()
  applications.push(application)
  localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(applications))

  // 自动批准（简化流程）
  approveApplication(application.id)

  return true
}

/**
 * 获取所有申请
 */
function getApplications(): TeamApplication[] {
  if (typeof window === 'undefined') return []

  const saved = localStorage.getItem(STORAGE_KEY_APPLICATIONS)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  }

  return []
}

/**
 * 批准申请
 */
function approveApplication(applicationId: string): boolean {
  if (typeof window === 'undefined') return false

  const applications = getApplications()
  const application = applications.find(a => a.id === applicationId)

  if (!application) return false

  // 更新申请状态
  application.status = 'approved'
  localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(applications))

  // 将用户加入战队
  const userId = application.userId
  const teamId = application.teamId

  localStorage.setItem(`${STORAGE_KEY_USER_TEAM}${userId}`, teamId)

  // 更新战队成员列表
  const teams = getAllTeams()
  const team = teams.find(t => t.id === teamId)

  if (team) {
    const newMember: Member = {
      id: userId,
      name: application.userName,
      avatar: '/default-avatar.png',
      role: '队员',
      level: 1,
      power: 1000,
      joinDate: new Date(),
    }

    team.members.push(newMember)
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams))
  }

  return true
}

/**
 * 退出战队
 */
export function leaveTeam(): boolean {
  if (typeof window === 'undefined') return false

  const userId = getUserId()
  const currentTeam = getUserTeam()

  if (!currentTeam) {
    alert('您不在任何战队中')
    return false
  }

  // 检查是否是队长
  if (currentTeam.leader.id === userId) {
    alert('队长不能直接退出战队，请先转让队长')
    return false
  }

  // 从战队中移除
  const teams = getAllTeams()
  const team = teams.find(t => t.id === currentTeam.id)

  if (team) {
    team.members = team.members.filter(m => m.id !== userId)
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams))
  }

  // 清除用户战队记录
  localStorage.removeItem(`${STORAGE_KEY_USER_TEAM}${userId}`)

  return true
}

/**
 * 添加战队活动
 */
export function addTeamActivity(teamId: string, activity: Omit<TeamActivity, 'id'>): boolean {
  if (typeof window === 'undefined') return false

  const teams = getAllTeams()
  const team = teams.find(t => t.id === teamId)

  if (!team) return false

  const newActivity: TeamActivity = {
    ...activity,
    id: `act_${Date.now()}`,
  }

  team.activities.unshift(newActivity)

  // 更新战队积分
  team.stats.weeklyPoints += activity.points
  team.stats.totalPoints += activity.points

  if (activity.type === 'battle' && activity.result) {
    team.stats.totalBattles += 1
    if (activity.result === 'win') {
      team.stats.wins += 1
    } else if (activity.result === 'lose') {
      team.stats.losses += 1
    } else {
      team.stats.draws += 1
    }
    team.stats.winRate = (team.stats.wins / team.stats.totalBattles) * 100
  }

  localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams))

  return true
}
