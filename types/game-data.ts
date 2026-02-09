/**
 * 游戏数据展示系统类型定义
 */

export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type EquipmentType = 'weapon' | 'armor' | 'accessory'
export type PetRarity = 'normal' | 'rare' | 'epic' | 'legendary'

export interface Equipment {
  id: string
  name: string
  type: EquipmentType
  rarity: EquipmentRarity
  level: number
  power: number
  attributes: {
    attack?: number
    defense?: number
    hp?: number
    speed?: number
    critical?: number
    [key: string]: number | undefined
  }
  icon: string
  description: string
}

export interface Pet {
  id: string
  name: string
  rarity: PetRarity
  level: number
  power: number
  skills: PetSkill[]
  attributes: {
    attack: number
    defense: number
    hp: number
    speed: number
  }
  icon: string
  description: string
  isActive: boolean
}

export interface PetSkill {
  id: string
  name: string
  description: string
  cooldown: number
  damage?: number
  effect?: string
  icon: string
}

export interface CharacterStats {
  level: number
  exp: number
  maxExp: number
  attack: number
  defense: number
  hp: number
  maxHp: number
  speed: number
  critical: number
  accuracy: number
}

export interface Skill {
  id: string
  name: string
  level: number
  maxLevel: number
  description: string
  type: 'active' | 'passive'
  cooldown?: number
  icon: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum'
  progress: number
  target: number
  unlocked: boolean
  unlockedAt?: Date
  reward: {
    title?: string
    points?: number
    item?: string
  }
}

export interface GameData {
  userId: string
  equipment: {
    weapon: Equipment | null
    armor: Equipment | null
    accessories: Equipment[]
    totalPower: number
  }
  pets: {
    active: Pet | null
    collection: Pet[]
  }
  character: {
    stats: CharacterStats
    skills: Skill[]
  }
  achievements: {
    total: number
    unlocked: number
    list: Achievement[]
  }
}
