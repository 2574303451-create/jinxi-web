/**
 * 用户工具函数
 * 统一管理用户ID和用户名，消除重复代码
 */

/**
 * 获取用户ID
 * 如果不存在则自动生成并存储
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  let id = localStorage.getItem('jinxi-user-id')
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('jinxi-user-id', id)
  }
  return id
}

/**
 * 获取用户名
 */
export function getUserName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('jinxi-user-name') || ''
}

/**
 * 设置用户名
 */
export function setUserName(name: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jinxi-user-name', name)
  }
}
