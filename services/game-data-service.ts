/**
 * 游戏数据服务
 * 使用 LocalStorage 存储游戏数据
 */

import { GameData, Equipment, Pet, Achievement, CharacterStats, Skill } from '../types/game-data'
import { getUserId } from '../lib/user-utils'

const STORAGE_KEY_GAME_DATA = 'jinxi-game-data-'

// 示例装备数据
const SAMPLE_EQUIPMENT: Equipment[] = [
  {
    id: 'weapon_1',
    name: '星辰之弓',
    type: 'weapon',
    rarity: 'legendary',
    level: 80,
    power: 2500,
    attributes: {
      attack: 850,
      critical: 25,
      speed: 15,
    },
    icon: '🏹',
    description: '传说中的神弓，蕴含星辰之力',
  },
  {
    id: 'armor_1',
    name: '龙鳞战甲',
    type: 'armor',
    rarity: 'epic',
    level: 75,
    power: 2000,
    attributes: {
      defense: 650,
      hp: 1500,
    },
    icon: '🛡️',
    description: '由龙鳞打造的坚固铠甲',
  },
  {
    id: 'accessory_1',
    name: '疾风之翼',
    type: 'accessory',
    rarity: 'rare',
    level: 70,
    power: 1200,
    attributes: {
      speed: 35,
      attack: 200,
    },
    icon: '🪶',
    description: '增加移动速度的神奇饰品',
  },
]

// 示例宠物数据
const SAMPLE_PETS: Pet[] = [
  {
    id: 'pet_1',
    name: '炎龙宝宝',
    rarity: 'legendary',
    level: 60,
    power: 1800,
    skills: [
      {
        id: 'skill_1',
        name: '火焰吐息',
        description: '喷射强力火焰攻击敌人',
        cooldown: 5,
        damage: 500,
        icon: '🔥',
      },
      {
        id: 'skill_2',
        name: '龙之护盾',
        description: '为主人提供护盾',
        cooldown: 10,
        effect: '吸收300伤害',
        icon: '🛡️',
      },
    ],
    attributes: {
      attack: 450,
      defense: 300,
      hp: 2000,
      speed: 25,
    },
    icon: '🐉',
    description: '稀有的炎龙幼崽，拥有强大的火焰能力',
    isActive: true,
  },
  {
    id: 'pet_2',
    name: '冰霜狐狸',
    rarity: 'epic',
    level: 55,
    power: 1500,
    skills: [
      {
        id: 'skill_3',
        name: '冰冻术',
        description: '冰冻敌人',
        cooldown: 8,
        effect: '冻结2秒',
        icon: '❄️',
      },
    ],
    attributes: {
      attack: 380,
      defense: 250,
      hp: 1600,
      speed: 35,
    },
    icon: '🦊',
    description: '灵巧的冰霜狐狸，擅长控制技能',
    isActive: false,
  },
  {
    id: 'pet_3',
    name: '雷电鸟',
    rarity: 'rare',
    level: 50,
    power: 1200,
    skills: [
      {
        id: 'skill_4',
        name: '雷霆一击',
        description: '召唤雷电攻击',
        cooldown: 6,
        damage: 350,
        icon: '⚡',
      },
    ],
    attributes: {
      attack: 320,
      defense: 200,
      hp: 1200,
      speed: 40,
    },
    icon: '🦅',
    description: '速度极快的雷电鸟',
    isActive: false,
  },
]

// 示例成就数据
const SAMPLE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_1',
    name: '新手上路',
    description: '达到10级',
    icon: '🎯',
    rarity: 'bronze',
    progress: 10,
    target: 10,
    unlocked: true,
    unlockedAt: new Date('2024-01-15'),
    reward: { points: 100 },
  },
  {
    id: 'ach_2',
    name: '百战老兵',
    description: '完成100场战斗',
    icon: '⚔️',
    rarity: 'silver',
    progress: 100,
    target: 100,
    unlocked: true,
    unlockedAt: new Date('2024-02-01'),
    reward: { points: 500, title: '老兵' },
  },
  {
    id: 'ach_3',
    name: '装备大师',
    description: '收集10件史诗装备',
    icon: '💎',
    rarity: 'gold',
    progress: 7,
    target: 10,
    unlocked: false,
    reward: { points: 1000, item: '神秘宝箱' },
  },
  {
    id: 'ach_4',
    name: '传奇猎人',
    description: '获得传说级宠物',
    icon: '👑',
    rarity: 'platinum',
    progress: 1,
    target: 1,
    unlocked: true,
    unlockedAt: new Date('2024-02-05'),
    reward: { points: 2000, title: '传奇猎人' },
  },
]

/**
 * 获取默认游戏数据
 */
function getDefaultGameData(userId: string): GameData {
  return {
    userId,
    equipment: {
      weapon: SAMPLE_EQUIPMENT[0],
      armor: SAMPLE_EQUIPMENT[1],
      accessories: [SAMPLE_EQUIPMENT[2]],
      totalPower: 5700,
    },
    pets: {
      active: SAMPLE_PETS[0],
      collection: SAMPLE_PETS,
    },
    character: {
      stats: {
        level: 85,
        exp: 45000,
        maxExp: 50000,
        attack: 1250,
        defense: 850,
        hp: 8500,
        maxHp: 10000,
        speed: 75,
        critical: 35,
        accuracy: 88,
      },
      skills: [
        {
          id: 'skill_char_1',
          name: '精准射击',
          level: 10,
          maxLevel: 10,
          description: '提高命中率和暴击率',
          type: 'passive',
          icon: '🎯',
        },
        {
          id: 'skill_char_2',
          name: '连珠箭',
          level: 8,
          maxLevel: 10,
          description: '快速射出多支箭矢',
          type: 'active',
          cooldown: 8,
          icon: '🏹',
        },
        {
          id: 'skill_char_3',
          name: '闪避',
          level: 7,
          maxLevel: 10,
          description: '提高闪避率',
          type: 'passive',
          icon: '💨',
        },
      ],
    },
    achievements: {
      total: SAMPLE_ACHIEVEMENTS.length,
      unlocked: SAMPLE_ACHIEVEMENTS.filter(a => a.unlocked).length,
      list: SAMPLE_ACHIEVEMENTS,
    },
  }
}

/**
 * 获取用户游戏数据
 */
export function getGameData(): GameData {
  if (typeof window === 'undefined') {
    return getDefaultGameData('anonymous')
  }

  const userId = getUserId()
  const storageKey = `${STORAGE_KEY_GAME_DATA}${userId}`
  const saved = localStorage.getItem(storageKey)

  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return getDefaultGameData(userId)
    }
  }

  // 首次加载，保存默认数据
  const defaultData = getDefaultGameData(userId)
  localStorage.setItem(storageKey, JSON.stringify(defaultData))
  return defaultData
}

/**
 * 保存游戏数据
 */
export function saveGameData(data: GameData): boolean {
  if (typeof window === 'undefined') return false

  const userId = getUserId()
  const storageKey = `${STORAGE_KEY_GAME_DATA}${userId}`

  try {
    localStorage.setItem(storageKey, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/**
 * 装备物品
 */
export function equipItem(equipment: Equipment): boolean {
  const data = getGameData()

  switch (equipment.type) {
    case 'weapon':
      data.equipment.weapon = equipment
      break
    case 'armor':
      data.equipment.armor = equipment
      break
    case 'accessory':
      if (data.equipment.accessories.length < 3) {
        data.equipment.accessories.push(equipment)
      } else {
        return false
      }
      break
  }

  // 重新计算总战力
  data.equipment.totalPower = calculateTotalPower(data.equipment)

  return saveGameData(data)
}

/**
 * 卸下装备
 */
export function unequipItem(equipmentId: string): boolean {
  const data = getGameData()

  if (data.equipment.weapon?.id === equipmentId) {
    data.equipment.weapon = null
  } else if (data.equipment.armor?.id === equipmentId) {
    data.equipment.armor = null
  } else {
    data.equipment.accessories = data.equipment.accessories.filter(a => a.id !== equipmentId)
  }

  data.equipment.totalPower = calculateTotalPower(data.equipment)

  return saveGameData(data)
}

/**
 * 计算总战力
 */
function calculateTotalPower(equipment: GameData['equipment']): number {
  let total = 0

  if (equipment.weapon) total += equipment.weapon.power
  if (equipment.armor) total += equipment.armor.power
  equipment.accessories.forEach(acc => {
    total += acc.power
  })

  return total
}

/**
 * 切换出战宠物
 */
export function setActivePet(petId: string): boolean {
  const data = getGameData()
  const pet = data.pets.collection.find(p => p.id === petId)

  if (!pet) return false

  // 取消当前出战宠物
  data.pets.collection.forEach(p => {
    p.isActive = false
  })

  // 设置新的出战宠物
  pet.isActive = true
  data.pets.active = pet

  return saveGameData(data)
}

/**
 * 解锁成就
 */
export function unlockAchievement(achievementId: string): boolean {
  const data = getGameData()
  const achievement = data.achievements.list.find(a => a.id === achievementId)

  if (!achievement || achievement.unlocked) return false

  achievement.unlocked = true
  achievement.unlockedAt = new Date()
  data.achievements.unlocked += 1

  return saveGameData(data)
}

/**
 * 更新成就进度
 */
export function updateAchievementProgress(achievementId: string, progress: number): boolean {
  const data = getGameData()
  const achievement = data.achievements.list.find(a => a.id === achievementId)

  if (!achievement) return false

  achievement.progress = Math.min(progress, achievement.target)

  // 如果达到目标，自动解锁
  if (achievement.progress >= achievement.target && !achievement.unlocked) {
    unlockAchievement(achievementId)
  }

  return saveGameData(data)
}
