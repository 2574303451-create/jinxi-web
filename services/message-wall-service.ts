"use client"

import { MessageWallPost, CreatePostData } from '@/types/message-wall'

const STORAGE_KEY = 'jinxi-message-wall'
const IMAGES_STORAGE_KEY = 'jinxi-message-wall-images'

// 模拟网络延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 图片压缩函数
function compressImage(file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

class MessageWallService {
  private listeners: Array<(posts: MessageWallPost[]) => void> = []

  // 获取所有留言
  async getPosts(): Promise<MessageWallPost[]> {
    await delay(500) // 模拟网络延迟
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const posts = JSON.parse(stored) as MessageWallPost[]
        return posts.sort((a, b) => b.timestamp - a.timestamp)
      }
      
      // 返回一些初始数据
      const initialPosts: MessageWallPost[] = [
        {
          id: '1',
          author: '今夕_小风',
          content: '欢迎大家在留言墙分享想法！🎉',
          timestamp: Date.now() - 3600000,
          likes: 5,
          likedBy: [],
          avatar: '/1.png'
        },
        {
          id: '2',
          author: '今夕_春华',
          content: '公会氛围真的很棒，大家都很友善 💫',
          timestamp: Date.now() - 7200000,
          likes: 3,
          likedBy: [],
          avatar: '/13.png'
        }
      ]
      
      this.savePosts(initialPosts)
      return initialPosts
    } catch (error) {
      console.error('获取留言失败:', error)
      return []
    }
  }

  // 创建新留言
  async createPost(data: CreatePostData): Promise<MessageWallPost> {
    await delay(300)
    
    try {
      const posts = await this.getPosts()
      const imageUrls: string[] = []
      
      // 处理图片上传
      if (data.images && data.images.length > 0) {
        for (const image of data.images) {
          const compressedImage = await compressImage(image)
          const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // 保存图片到本地存储
          const storedImages = JSON.parse(localStorage.getItem(IMAGES_STORAGE_KEY) || '{}')
          storedImages[imageId] = compressedImage
          localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(storedImages))
          
          imageUrls.push(imageId)
        }
      }
      
      const newPost: MessageWallPost = {
        id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        author: data.author.trim(),
        content: data.content.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
        timestamp: Date.now(),
        likes: 0,
        likedBy: [],
        avatar: data.avatar || `/placeholder-user.jpg`
      }
      
      const updatedPosts = [newPost, ...posts]
      this.savePosts(updatedPosts)
      this.notifyListeners(updatedPosts)
      
      return newPost
    } catch (error) {
      console.error('创建留言失败:', error)
      throw new Error('发送留言失败，请重试')
    }
  }

  // 点赞/取消点赞
  async toggleLike(postId: string, userId: string): Promise<MessageWallPost> {
    await delay(200)
    
    try {
      const posts = await this.getPosts()
      const postIndex = posts.findIndex(p => p.id === postId)
      
      if (postIndex === -1) {
        throw new Error('留言不存在')
      }
      
      const post = posts[postIndex]
      const likedIndex = post.likedBy.indexOf(userId)
      
      if (likedIndex > -1) {
        // 取消点赞
        post.likedBy.splice(likedIndex, 1)
        post.likes = Math.max(0, post.likes - 1)
      } else {
        // 点赞
        post.likedBy.push(userId)
        post.likes += 1
      }
      
      this.savePosts(posts)
      this.notifyListeners(posts)
      
      return post
    } catch (error) {
      console.error('点赞失败:', error)
      throw new Error('操作失败，请重试')
    }
  }

  // 获取图片数据
  getImageData(imageId: string): string | null {
    try {
      const storedImages = JSON.parse(localStorage.getItem(IMAGES_STORAGE_KEY) || '{}')
      return storedImages[imageId] || null
    } catch (error) {
      console.error('获取图片失败:', error)
      return null
    }
  }

  // 订阅数据变化
  subscribe(listener: (posts: MessageWallPost[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // 保存到本地存储
  private savePosts(posts: MessageWallPost[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
    } catch (error) {
      console.error('保存留言失败:', error)
    }
  }

  // 通知监听器
  private notifyListeners(posts: MessageWallPost[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(posts)
      } catch (error) {
        console.error('通知监听器失败:', error)
      }
    })
  }

  // 清空所有数据（开发调试用）
  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(IMAGES_STORAGE_KEY)
    this.notifyListeners([])
  }
}

export const messageWallService = new MessageWallService()
