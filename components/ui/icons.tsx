import React from 'react'
import {
  X,
  BookOpen,
  Plus,
  Search,
  Pin,
  PinOff,
  Paperclip,
  Image,
  Video,
  Eye,
  Heart,
  Star,
  Trash2,
  Send,
  Mail,
  Rocket,
  Megaphone,
  Calendar,
  Users,
  MessageCircle,
  Clock,
  Shield,
  Trophy,
  Gamepad2,
  Film,
  HelpCircle,
  Mic,
  Gift,
  ArrowUp,
  Sparkles,
  RefreshCw,
  List,
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Home,
  User,
  Camera,
  Download,
  Upload,
  Edit,
  Copy,
  Share,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Loader
} from 'lucide-react'

import { cn } from '../../lib/utils'

interface IconProps {
  className?: string
  size?: number | string
  color?: string
  [key: string]: any
}

// 图标映射对象
export const icons = {
  // 基础操作
  close: X,
  add: Plus,
  search: Search,
  edit: Edit,
  copy: Copy,
  share: Share,
  delete: Trash2,
  refresh: RefreshCw,
  
  // 导航和方向
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'arrow-up': ArrowUp,
  'external-link': ExternalLink,
  
  // 内容类型
  book: BookOpen,
  image: Image,
  video: Video,
  file: Paperclip,
  camera: Camera,
  
  // 交互
  eye: Eye,
  heart: Heart,
  'heart-fill': Heart,
  star: Star,
  'star-fill': Star,
  pin: Pin,
  'pin-off': PinOff,
  
  // 通信
  send: Send,
  mail: Mail,
  message: MessageCircle,
  mic: Mic,
  
  // 用户和社交
  user: User,
  users: Users,
  rocket: Rocket,
  gift: Gift,
  sparkles: Sparkles,
  
  // 信息和状态
  megaphone: Megaphone,
  calendar: Calendar,
  clock: Clock,
  alarm: AlarmClock,
  shield: Shield,
  trophy: Trophy,
  gamepad: Gamepad2,
  film: Film,
  help: HelpCircle,
  settings: Settings,
  home: Home,
  list: List,
  
  // 文件操作
  download: Download,
  upload: Upload,
  
  // 状态指示
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'alert-circle': AlertCircle,
  info: Info,
  loader: Loader,
}

// 图标组件
export function Icon({ 
  name, 
  className, 
  size = 16, 
  color, 
  filled = false,
  ...props 
}: IconProps & { 
  name: keyof typeof icons
  filled?: boolean 
}) {
  let IconComponent = icons[name]
  
  // 处理填充状态的图标
  if (filled && name === 'heart') {
    IconComponent = icons['heart-fill']
  } else if (filled && name === 'star') {
    IconComponent = icons['star-fill']
  }
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

  return (
    <IconComponent
      className={cn('inline-block', className)}
      size={size}
      color={color}
      {...props}
    />
  )
}

// 便捷的图标组件
export const CloseIcon = (props: IconProps) => <Icon name="close" {...props} />
export const AddIcon = (props: IconProps) => <Icon name="add" {...props} />
export const SearchIcon = (props: IconProps) => <Icon name="search" {...props} />
export const BookIcon = (props: IconProps) => <Icon name="book" {...props} />
export const PinIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => 
  <Icon name={filled ? "pin" : "pin"} {...props} />
export const HeartIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => 
  <Icon name="heart" filled={filled} {...props} />
export const StarIcon = ({ filled, ...props }: IconProps & { filled?: boolean }) => 
  <Icon name="star" filled={filled} {...props} />
export const EyeIcon = (props: IconProps) => <Icon name="eye" {...props} />
export const DeleteIcon = (props: IconProps) => <Icon name="delete" {...props} />
export const SendIcon = (props: IconProps) => <Icon name="send" {...props} />
export const MailIcon = (props: IconProps) => <Icon name="mail" {...props} />
export const RocketIcon = (props: IconProps) => <Icon name="rocket" {...props} />
export const ImageIcon = (props: IconProps) => <Icon name="image" {...props} />
export const VideoIcon = (props: IconProps) => <Icon name="video" {...props} />
export const FileIcon = (props: IconProps) => <Icon name="file" {...props} />
export const RefreshIcon = (props: IconProps) => <Icon name="refresh" {...props} />
