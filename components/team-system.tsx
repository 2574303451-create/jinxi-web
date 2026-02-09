'use client'

/**
 * 战队系统组件
 * 展示战队列表、排行榜和战队详情
 */

import { useState, useEffect } from 'react'
import { Team, TeamRanking } from '../types/team'
import {
  getAllTeams,
  getTeamRankings,
  getUserTeam,
  applyToTeam,
  leaveTeam,
} from '../services/team-service'

export function TeamSystem() {
  const [teams, setTeams] = useState<Team[]>([])
  const [rankings, setRankings] = useState<TeamRanking[]>([])
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'ranking'>('list')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const allTeams = getAllTeams()
    const teamRankings = getTeamRankings()
    const currentTeam = getUserTeam()

    setTeams(allTeams)
    setRankings(teamRankings)
    setUserTeam(currentTeam)
  }

  const handleApply = (team: Team) => {
    setSelectedTeam(team)
    setShowApplyDialog(true)
  }

  const submitApplication = () => {
    if (!selectedTeam) return

    const success = applyToTeam(selectedTeam.id, applyMessage)
    if (success) {
      alert('申请成功！已自动加入战队')
      setShowApplyDialog(false)
      setApplyMessage('')
      loadData()
    }
  }

  const handleLeave = () => {
    if (confirm('确定要退出当前战队吗？')) {
      const success = leaveTeam()
      if (success) {
        alert('已退出战队')
        loadData()
      }
    }
  }

  const getTeamColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      '#FFD93D': 'cartoon-yellow',
      '#6BCFFF': 'cartoon-cyan',
      '#FF6B9D': 'cartoon-pink',
      '#C77DFF': 'cartoon-purple',
      '#4ADE80': 'cartoon-green',
    }
    return colorMap[color] || 'cartoon-cyan'
  }

  return (
    <div className="relative">
      {/* 用户当前战队 */}
      {userTeam && (
        <div
          className="p-6 rounded-2xl border mb-6 cartoon-card cartoon-card-pink animate-bounce-in"
          style={{
            background: 'linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03))',
            borderColor: userTeam.color + '80',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{userTeam.icon}</span>
              <div>
                <h3
                  className="text-xl font-bold gradient-text-candy"
                  style={{ fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive' }}
                >
                  {userTeam.name}
                </h3>
                <p className="text-white/60 text-sm">{userTeam.slogan}</p>
              </div>
            </div>
            <button
              onClick={handleLeave}
              className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors text-sm"
            >
              退出战队
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-candy">{userTeam.stats.totalPoints}</div>
              <div className="text-sm text-white/60 mt-1">总积分</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-sky">#{userTeam.stats.rank}</div>
              <div className="text-sm text-white/60 mt-1">排名</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-fresh">{userTeam.stats.winRate.toFixed(1)}%</div>
              <div className="text-sm text-white/60 mt-1">胜率</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-2xl font-bold gradient-text-rainbow">{userTeam.members.length}</div>
              <div className="text-sm text-white/60 mt-1">成员</div>
            </div>
          </div>
        </div>
      )}

      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-2xl font-bold gradient-text-sky"
          style={{ fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive' }}
        >
          ⚔️ 战队系统
        </h3>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'list'
              ? 'cartoon-btn cartoon-btn-sky'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          🛡️ 战队列表
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'ranking'
              ? 'cartoon-btn cartoon-btn-fresh'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
          }`}
        >
          🏆 排行榜
        </button>
      </div>

      {/* 战队列表 */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className="p-6 rounded-xl border transition-all hover:scale-[1.02] animate-slide-in-up"
              style={{
                background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
                borderColor: team.color + '40',
                animationDelay: `${index * 0.1}s`,
              }}
            >
              {/* 战队头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="text-5xl animate-float"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    {team.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xl font-bold text-white">{team.name}</h4>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: team.color + '30',
                          color: team.color,
                        }}
                      >
                        #{team.stats.rank}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm mb-2">{team.slogan}</p>
                    <p className="text-white/40 text-xs">{team.description}</p>
                  </div>
                </div>

                {!userTeam && (
                  <button
                    onClick={() => handleApply(team)}
                    className="cartoon-btn cartoon-btn-pink px-4 py-2 text-sm"
                  >
                    申请加入
                  </button>
                )}
              </div>

              {/* 战队数据 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-yellow-300">{team.stats.weeklyPoints}</div>
                  <div className="text-xs text-white/60">本周积分</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-green-300">{team.stats.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-white/60">胜率</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-blue-300">{team.stats.wins}</div>
                  <div className="text-xs text-white/60">胜场</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-purple-300">{team.members.length}/{team.maxMembers}</div>
                  <div className="text-xs text-white/60">成员</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-cyan-300">{team.stats.totalBattles}</div>
                  <div className="text-xs text-white/60">总战斗</div>
                </div>
              </div>

              {/* 队长信息 */}
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>👑 队长：</span>
                <span className="text-white">{team.leader.name}</span>
                <span className="text-white/40">|</span>
                <span>📋 要求：{team.requirements}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 排行榜 */}
      {activeTab === 'ranking' && (
        <div className="space-y-3">
          {rankings.map((ranking, index) => (
            <div
              key={ranking.team.id}
              className="p-5 rounded-xl border transition-all hover:scale-[1.02] animate-slide-in-left"
              style={{
                background:
                  index < 3
                    ? 'linear-gradient(180deg,rgba(255,215,0,.15),rgba(255,215,0,.05))'
                    : 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
                borderColor: index < 3 ? '#FFD700' : 'rgba(255,255,255,.1)',
                animationDelay: `${index * 0.05}s`,
              }}
            >
              <div className="flex items-center gap-4">
                {/* 排名 */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                  {index === 0 && <span className="text-4xl">🥇</span>}
                  {index === 1 && <span className="text-4xl">🥈</span>}
                  {index === 2 && <span className="text-4xl">🥉</span>}
                  {index > 2 && (
                    <span className="text-2xl font-bold text-white/60">#{ranking.rank}</span>
                  )}
                </div>

                {/* 战队信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{ranking.team.icon}</span>
                    <h4 className="font-bold text-lg text-white">{ranking.team.name}</h4>
                    {ranking.trend !== 'same' && (
                      <span className={`text-sm ${ranking.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                        {ranking.trend === 'up' ? '↑' : '↓'} {ranking.trendChange}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm">{ranking.team.slogan}</p>
                </div>

                {/* 积分 */}
                <div className="text-right">
                  <div className="text-2xl font-bold gradient-text-candy">{ranking.weeklyPoints}</div>
                  <div className="text-xs text-white/60">本周积分</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 申请对话框 */}
      {showApplyDialog && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-gray-900 rounded-2xl border p-6 max-w-md w-full animate-bounce-in"
            style={{
              borderColor: selectedTeam.color + '60',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-4">申请加入 {selectedTeam.name}</h3>

            <div className="mb-4">
              <label className="block text-white/60 text-sm mb-2">申请留言（可选）</label>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="介绍一下自己..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApplyDialog(false)
                  setApplyMessage('')
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitApplication}
                className="flex-1 cartoon-btn cartoon-btn-pink px-4 py-3"
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
