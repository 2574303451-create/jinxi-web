export interface MessageWallPost {
  id: string
  author: string
  content: string
  images?: string[]
  timestamp: number
  likes: number
  likedBy: string[]
  avatar?: string
}

export interface MessageWallState {
  posts: MessageWallPost[]
  isLoading: boolean
  error: string | null
}

export interface CreatePostData {
  author: string
  content: string
  images?: File[]
  avatar?: string
}
