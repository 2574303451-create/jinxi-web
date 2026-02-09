'use client'

/**
 * 游戏数据面板组件
 * 展示装备、宠物、角色和成就数据
 */

import { useState, useEffect } from 'react'
import { GameData, Equipment, Pet, Achievement } from '../types/game-data'
import { getGameData, setActivePet } from '../services/game-data-service'

export function GameDataPanel() {
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [activeTab, setActiveTab] = useState<'equipment' | 'pets' | 'character' | 'achievements'>('equipment')

  useEffect(() => {
    loadGameData()
  }, [])

  const loadGameData = () => {
    const data = getGameData()
    setGameData(data)
  }

  const handleSetActivePet = (petId: string) => {
    const success = setActivePet(petId)
    if (success) {
      loadGameData()
    }
  }

  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      common: '#9CA3AF',
      normal: '#9CA3AF',
      rare: '#3B82F6',
      epic: '#A855F7',
      legendary: '#F59E0B',
      mythic: '#EF4444',
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
    }
    return colors[rarity] || '#9CA3AF'
  }

  const getRarityGlow = (rarity: string) => {
    const color = getRarityColor(rarity)
    return `0 0 20px ${color}80, 0 0 40px ${color}40`
  }

  if (!gameData) {
    return <div className="text-center py-8 text-white/60">加载中...</div>
  }

  return (
    <div className="relative">
      {/* 标题 */}
      <h3
        className="text-2xl font-bold gradient-text-rainbow mb-6"
        style={{ fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive' }}
      >
        🎮 游戏数据
      </h3>

      {/* Tab切换 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'equipment', label: '装备', icon: '⚔️' },
          { key: 'pets', label: '宠物', icon: '🐾' },
          { key: 'character', label: '角色', icon: '👤' },
          { key: 'achievements', label: '成就', icon: '🏆' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === tab.key
                ? 'cartoon-btn cartoon-btn-pink'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 装备Tab */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          {/* 总战力 */}
          <div
            className="p-6 rounded-2xl border text-center animate-bounce-in"
            style={{
              background: 'linear-gradient(180deg,rgba(255,215,0,.15),rgba(255,215,0,.05))',
              borderColor: '#FFD700',
            }}
          >
            <div className="text-5xl font-bold gradient-text-candy mb-2">
              {gameData.equipment.totalPower}
            </div>
            <div className="text-white/60">总战力</div>
          </div>

          {/* 武器 */}
          {gameData.equipment.weapon && (
            <EquipmentCard equipment={gameData.equipment.weapon} getRarityColor={getRarityColor} getRarityGlow={getRarityGlow} />
          )}

          {/* 防具 */}
          {gameData.equipment.armor && (
            <EquipmentCard equipment={gameData.equipment.armor} getRarityColor={getRarityColor} getRarityGlow={getRarityGlow} />
          )}

          {/* 饰品 */}
          {gameData.equipment.accessories.map(acc => (
            <EquipmentCard key={acc.id} equipment={acc} getRarityColor={getRarityColor} getRarityGlow={getRarityGlow} />
          ))}
        </div>
      )}

      {/* 宠物Tab */}
      {activeTab === 'pets' && (
        <div className="space-y-4">
          {gameData.pets.collection.map((pet, index) => (
            <div
              key={pet.id}
              className="p-5 rounded-xl border transition-all hover:scale-[1.02] animate-slide-in-up"
              style={{
                background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
                borderColor: getRarityColor(pet.rarity) + '40',
                boxShadow: pet.isActive ? getRarityGlow(pet.rarity) : 'none',
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="flex items-start gap-4">
                {/* 宠物图标 */}
                <div className="text-5xl animate-float" style={{ animationDelay: `${index * 0.2}s` }}>
                  {pet.icon}
                </div>

                {/* 宠物信息 */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xl font-bold text-white">{pet.name}</h4>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: getRarityColor(pet.rarity) + '30',
                        color: getRarityColor(pet.rarity),
                      }}
                    >
                      {pet.rarity}
                    </span>
                    {pet.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/30 text-green-300">
                        出战中
                      </span>
                    )}
                  </div>

                  <p className="text-white/60 text-sm mb-3">{pet.description}</p>

                  {/* 属性 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-sm font-bold text-red-300">{pet.attributes.attack}</div>
                      <div className="text-xs text-white/60">攻击</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-sm font-bold text-blue-300">{pet.attributes.defense}</div>
                      <div className="text-xs text-white/60">防御</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-sm font-bold text-green-300">{pet.attributes.hp}</div>
                      <div className="text-xs text-white/60">生命</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-sm font-bold text-yellow-300">{pet.attributes.speed}</div>
                      <div className="text-xs text-white/60">速度</div>
                    </div>
                  </div>

                  {/* 技能 */}
                  <div className="space-y-2 mb-3">
                    {pet.skills.map(skill => (
                      <div key={skill.id} className="flex items-center gap-2 text-sm">
                        <span className="text-xl">{skill.icon}</span>
                        <span className="text-white font-medium">{skill.name}</span>
                        <span className="text-white/40">-</span>
                        <span className="text-white/60">{skill.description}</span>
                      </div>
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  {!pet.isActive && (
                    <button
                      onClick={() => handleSetActivePet(pet.id)}
                      className="cartoon-btn cartoon-btn-fresh px-4 py-2 text-sm"
                    >
                      设为出战
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 角色Tab */}
      {activeTab === 'character' && (
        <div className="space-y-4">
          {/* 等级和经验 */}
          <div
            className="p-6 rounded-xl border animate-bounce-in"
            style={{
              background: 'linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03))',
              borderColor: 'rgba(255,107,157,.3)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60">等级</span>
              <span className="text-2xl font-bold gradient-text-candy">Lv.{gameData.character.stats.level}</span>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-white/60">经验值</span>
                <span className="text-white/60">
                  {gameData.character.stats.exp}/{gameData.character.stats.maxExp}
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-candy transition-all duration-500"
                  style={{
                    width: `${(gameData.character.stats.exp / gameData.character.stats.maxExp) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 属性雷达图（简化版） */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
              borderColor: 'rgba(107,207,255,.3)',
            }}
          >
            <h4 className="text-lg font-bold text-white mb-4">角色属性</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: '攻击', value: gameData.character.stats.attack, color: 'text-red-300' },
                { label: '防御', value: gameData.character.stats.defense, color: 'text-blue-300' },
                { label: '生命', value: gameData.character.stats.hp, color: 'text-green-300' },
                { label: '速度', value: gameData.character.stats.speed, color: 'text-yellow-300' },
                { label: '暴击', value: gameData.character.stats.critical, color: 'text-purple-300' },
                { label: '命中', value: gameData.character.stats.accuracy, color: 'text-cyan-300' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-lg bg-white/5">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-sm text-white/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 技能列表 */}
          <div
            className="p-6 rounded-xl border"
            style={{
              background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
              borderColor: 'rgba(199,125,255,.3)',
            }}
          >
            <h4 className="text-lg font-bold text-white mb-4">技能</h4>
            <div className="space-y-3">
              {gameData.character.skills.map(skill => (
                <div key={skill.id} className="p-4 rounded-lg bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{skill.icon}</span>
                      <span className="font-bold text-white">{skill.name}</span>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: skill.type === 'active' ? '#3B82F630' : '#A855F730',
                          color: skill.type === 'active' ? '#3B82F6' : '#A855F7',
                        }}
                      >
                        {skill.type === 'active' ? '主动' : '被动'}
                      </span>
                    </div>
                    <span className="text-white/60 text-sm">
                      Lv.{skill.level}/{skill.maxLevel}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm">{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 成就Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          {/* 成就统计 */}
          <div
            className="p-6 rounded-2xl border text-center animate-bounce-in"
            style={{
              background: 'linear-gradient(180deg,rgba(255,215,0,.15),rgba(255,215,0,.05))',
              borderColor: '#FFD700',
            }}
          >
            <div className="text-4xl font-bold gradient-text-rainbow mb-2">
              {gameData.achievements.unlocked}/{gameData.achievements.total}
            </div>
            <div className="text-white/60">已解锁成就</div>
          </div>

          {/* 成就列表 */}
          {gameData.achievements.list.map((achievement, index) => (
            <div
              key={achievement.id}
              className="p-5 rounded-xl border transition-all hover:scale-[1.02] animate-slide-in-up"
              style={{
                background: achievement.unlocked
                  ? 'linear-gradient(180deg,rgba(255,215,0,.1),rgba(255,215,0,.03))'
                  : 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
                borderColor: getRarityColor(achievement.rarity) + '40',
                opacity: achievement.unlocked ? 1 : 0.6,
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-bold text-white">{achievement.name}</h4>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: getRarityColor(achievement.rarity) + '30',
                        color: getRarityColor(achievement.rarity),
                      }}
                    >
                      {achievement.rarity}
                    </span>
                    {achievement.unlocked && (
                      <span className="text-green-400 text-sm">✓ 已解锁</span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mb-3">{achievement.description}</p>

                  {/* 进度条 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/60">进度</span>
                      <span className="text-white/60">
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-candy transition-all duration-500"
                        style={{
                          width: `${(achievement.progress / achievement.target) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* 奖励 */}
                  <div className="flex items-center gap-3 text-sm">
                    {achievement.reward.points && (
                      <span className="text-yellow-300">💰 {achievement.reward.points} 积分</span>
                    )}
                    {achievement.reward.title && (
                      <span className="text-purple-300">👑 {achievement.reward.title}</span>
                    )}
                    {achievement.reward.item && (
                      <span className="text-cyan-300">🎁 {achievement.reward.item}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 装备卡片组件
function EquipmentCard({
  equipment,
  getRarityColor,
  getRarityGlow,
}: {
  equipment: Equipment
  getRarityColor: (rarity: string) => string
  getRarityGlow: (rarity: string) => string
}) {
  return (
    <div
      className="p-5 rounded-xl border transition-all hover:scale-[1.02] animate-slide-in-up"
      style={{
        background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))',
        borderColor: getRarityColor(equipment.rarity) + '40',
        boxShadow: getRarityGlow(equipment.rarity),
      }}
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl animate-float">{equipment.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xl font-bold text-white">{equipment.name}</h4>
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{
                background: getRarityColor(equipment.rarity) + '30',
                color: getRarityColor(equipment.rarity),
              }}
            >
              {equipment.rarity}
            </span>
            <span className="text-white/60 text-sm">Lv.{equipment.level}</span>
          </div>
          <p className="text-white/60 text-sm mb-3">{equipment.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-white/5">
              <div className="text-lg font-bold gradient-text-candy">{equipment.power}</div>
              <div className="text-xs text-white/60">战力</div>
            </div>
            {Object.entries(equipment.attributes).map(([key, value]) =>
              value ? (
                <div key={key} className="text-center p-2 rounded-lg bg-white/5">
                  <div className="text-lg font-bold text-white">{value}</div>
                  <div className="text-xs text-white/60 capitalize">{key}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
