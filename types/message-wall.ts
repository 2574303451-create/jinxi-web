/** Shape returned by the existing public messages service. */
export interface Reaction {
  type: string;
  count: number;
  users: string[];
}

export interface Reply {
  id: string;
  name: string;
  content: string;
  color: string;
  timestamp: Date;
}

export interface Message {
  id: string;
  name: string;
  content: string;
  timestamp: Date;
  color: string;
  reactions: Reaction[];
  replies: Reply[];
  category: string;
  isPinned: boolean;
  imageUrl?: string | null;
}

export interface MessageWallPost {
  id: string;
  author: string;
  content: string;
  images?: string[];
  timestamp: number;
  likes: number;
  likedBy: string[];
  avatar?: string;
}

export interface MessageWallState {
  posts: MessageWallPost[];
  isLoading: boolean;
  error: string | null;
}

export interface CreatePostData {
  author: string;
  content: string;
  images?: File[];
  avatar?: string;
}
