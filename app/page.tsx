"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { OptimizedImage, AvatarImage } from "../components/ui/optimized-image"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { ToastProvider, useToast } from "../components/ui/toast"
import { sendRecruitmentEmail, RecruitmentData } from "../components/email-service"
import { Modal } from "../components/ui/modal"
import { RocketIcon, SendIcon, MailIcon, Icon, ImageIcon } from "../components/ui/icons"
import { useMemoryOptimization, useComponentCleanup } from "../hooks/use-memory-optimization"
import { FloatingBubbles } from "../components/ui/floating-bubbles"
import { HiddenEasterEggs } from "../components/hidden-easter-eggs"


// 动态导入重型组件以减少初始内存占用
const Marquee = lazy(() => import("../components/magicui/marquee").then(module => ({ default: module.Marquee })))
const MessageWall = lazy(() => import("../components/message-wall").then(module => ({ default: module.MessageWall })))
const CheckinWidget = lazy(() => import("../components/checkin-widget").then(module => ({ default: module.CheckinWidget })))
const LeaderboardWidget = lazy(() => import("../components/leaderboard-widget").then(module => ({ default: module.LeaderboardWidget })))
const StrategyWall = lazy(() => import("../components/strategy-wall").then(module => ({ default: module.StrategyWall })))
const Carousel3D = lazy(() => import("../components/magicui/3d-carousel").then(module => ({ default: module.Carousel3D })))
const MemberGrid = lazy(() => import("../components/magicui/member-grid").then(module => ({ default: module.MemberGrid })))
const Tabs = lazy(() => import("../components/ui/tabs").then(module => ({ default: module.Tabs })))
const Progress = lazy(() => import("../components/ui/progress").then(module => ({ default: module.Progress })))
const Accordion = lazy(() => import("../components/ui/accordion").then(module => ({ default: module.Accordion })))
const DailyTasks = lazy(() => import("../components/daily-tasks"))
const TeamSystem = lazy(() => import("../components/team-system"))
const GameDataPanel = lazy(() => import("../components/game-data-panel"))

// 组件加载占位符
const ComponentLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="sm" />
      <span className="ml-2 text-white/60">加载中...</span>
    </div>
  }>
    {children}
  </Suspense>
)

function PageContent() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStrategyWallOpen, setIsStrategyWallOpen] = useState(false)
  
  // 使用内存优化钩子
  const { registerCleanup, getMemoryUsage } = useMemoryOptimization()
  const { addCleanup } = useComponentCleanup()
  
  // 招新表单数据
  const [formData, setFormData] = useState<RecruitmentData>({
    nickname: '',
    contact: '',
    time: '',
    role: '',
    message: ''
  })
  const toast = useToast()

  // 处理表单输入
  const handleInputChange = (field: keyof RecruitmentData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // 处理表单提交
  const handleSubmit = async () => {
    if (!formData.nickname.trim() || !formData.contact.trim()) {
      toast.addToast('请填写"游戏昵称"和"联系方式"', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await sendRecruitmentEmail(
        formData,
        undefined, // 使用默认配置
        (message, type) => {
          // 进度提示
          if (type === 'success') {
            toast.addToast(message, 'success')
          } else if (type === 'error') {
            toast.addToast(message, 'error')
          } else {
            toast.addToast(message, 'info')
          }
        }
      )

      if (result.success) {
        // 清空表单
        setFormData({
          nickname: '',
          contact: '',
          time: '',
          role: '',
          message: ''
        })
        setIsModalOpen(false)
      }
    } catch (error) {
      toast.addToast(error instanceof Error ? error.message : '发送失败，请重试', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 邮箱客户端备选方案
  const handleMailtoFallback = () => {
    const subject = encodeURIComponent(`【招新申请】${formData.nickname || ""}`)
    const body = encodeURIComponent(
      `游戏昵称：${formData.nickname}\n` +
      `联系方式：${formData.contact}\n` +
      `在线时段：${formData.time}\n` +
      `偏好定位：${formData.role}\n` +
      `留言：${formData.message}`
    )
    
    window.location.href = `mailto:leijia_13335319637@163.com?subject=${subject}&body=${body}`
  }

  // 轮播展示成员 - 12人，ID 1-12
  const carouselMembers = [
    {
      id: 1,
      name: "今夕_执手",
      image: "/1.png",
      role: "会长",
      description: "热爱今夕",
    },
    {
      id: 2,
      name: "今夕_淡意衬优柔",
      image: "/2.png",
      role: "技术",
      description: "技术宅",
    },
    {
      id: 3,
      name: "今夕_恐龙",
      image: "/3.png",
      role: "组织团结",
      description: "爱睡觉",
    },
    {
      id: 4,
      name: "今夕_朝云去",
      image: "/4.png",
      role: "摆烂",
      description: "擅长嘴炮",
    },
    {
      id: 5,
      name: "今夕_时光",
      image: "/5.png",
      role: "摆烂",
      description: "时常联系不到人",
    },
    {
      id: 6,
      name: "今夕_心安",
      image: "/6.png",
      role: "摆烂",
      description: "今夕前期唯一女生",
    },
    {
      id: 7,
      name: "今夕_小夏",
      image: "/7.png",
      role: "摆烂",
      description: "摆子！",
    },
    {
      id: 8,
      name: "今夕_掺水的凉白开",
      image: "/8.png",
      role: "情绪调控",
      description: "今夕小太阳",
    },
    {
      id: 9,
      name: "今夕_臭脚妹妹",
      image: "/9.png",
      role: "东北老爷们",
      description: "今夕现存唯一结婚者",
    },
    {
      id: 10,
      name: "今夕_舔狗",
      image: "/10.png",
      role: "嘴炮",
      description: "今夕嘴炮替代者",
    },
    {
      id: 11,
      name: "今夕_灰常",
      image: "/11.png",
      role: "摆烂",
      description: "前期肝帝当之无愧 后期销声匿迹查无此人",
    },
    {
      id: 12,
      name: "今夕_小恒",
      image: "/12.png",
      role: "技术控",
      description: "清晰思想 今夕早期技术担当",
    },
  ]

  // 成员展示墙 - 30人，ID 13-42
  const allMembers = [
    {
      id: 13,
      name: "今夕_执手问年华",
      image: "/13.png",
      role: "会长",
      description: "热爱今夕",
    },
    {
      id: 14,
      name: "今夕_淡意",
      image: "/14.png",
      role: "副会",
      description: "技术宅",
    },
    {
      id: 15,
      name: "今夕_啵咕",
      image: "/15.png",
      role: "副会",
      description: "有任何问题可以优先问我哦~",
    },
    {
      id: 16,
      name: "今夕_时光",
      image: "/16.png",
      role: "副会",
      description: "浙大高材生 时常查无此人",
    },
    {
      id: 17,
      name: "今夕_洗菜",
      image: "/17.png",
      role: "副会",
      description: "今夕现任团宠",
    },
    {
      id: 18,
      name: "今夕_一笑作春温",
      image: "/18.png",
      role: "副会",
      description: "负责团队支援和资源管理",
    },
    {
      id: 19,
      name: "今夕_阿姨",
      image: "/19.png",
      role: "副会",
      description: "时常遁走 今夕首位宝妈",
    },
    {
      id: 20,
      name: "今夕_臭脚妹妹",
      image: "/20.png",
      role: "副会",
      description: "东北老爷们 今夕现存唯一结婚者",
    },
    {
      id: 21,
      name: "今夕_心安",
      image: "/21.png",
      role: "副会",
      description: "时代的眼泪",
    },
    {
      id: 22,
      name: "今夕_掺水的凉白开",
      image: "/22.png",
      role: "副会",
      description: "可爱小太阳",
    },
    {
      id: 23,
      name: "今夕_我是如此相信",
      image: "/23.png",
      role: "副会",
      description: "超超",
    },
    {
      id: 24,
      name: "今夕_道秋",
      image: "/24.png",
      role: "副会",
      description: "未定 后续补充",
    },
    {
      id: 25,
      name: "今夕_郁金香",
      image: "/25.png",
      role: "副会",
      description: "yyds",
    },
    {
      id: 26,
      name: "今夕_小熊超勇敢",
      image: "/26.png",
      role: "精英",
      description: "壕气冲天",
    },
    {
      id: 27,
      name: "今夕_御词姐敲可爱",
      image: "/27.png",
      role: "精英",
      description: "今夕第一黑虎",
    },
    {
      id: 28,
      name: "今夕_绾君",
      image: "/28.png",
      role: "精英",
      description: "未定 后续补充",
    },
    {
      id: 29,
      name: "今夕_舔狗",
      image: "/29.png",
      role: "精英",
      description: "嘴炮",
    },
    {
      id: 30,
      name: "今夕_白",
      image: "/30.png",
      role: "精英",
      description: "黑白双煞 公会boss常见NPC",
    },
    {
      id: 31,
      name: "今夕_不氪金不改名",
      image: "/31.png",
      role: "精英",
      description: "未定 后续补充",
    },
    {
      id: 32,
      name: "今夕_陈",
      image: "/32.png",
      role: "精英",
      description: "未定 后续补充",
    },
    {
      id: 33,
      name: "今夕_鲤鱼跃油门",
      image: "/33.png",
      role: "精英",
      description: "未定 后续补充",
    },
    {
      id: 34,
      name: "今夕_忆呀呀",
      image: "/34.png",
      role: "精英",
      description: "未定 后续补充",
    },
    {
      id: 35,
      name: "今夕_执手吃啵咕",
      image: "/35.png",
      role: "萌新",
      description: "未定 后续补充",
    },
    {
      id: 36,
      name: "今夕_琼枝意",
      image: "/36.png",
      role: "萌新",
      description: "未定 后续补充",
    },
    {
      id: 37,
      name: "今夕_迷迷糊",
      image: "/37.png",
      role: "萌新",
      description: "未定 后续补充",
    },
    {
      id: 38,
      name: "今夕_LoYuy",
      image: "/38.png",
      role: "萌新",
      description: "未定 后续补充",
    },
    {
      id: 39,
      name: "今夕_朝云去",
      image: "/39.png",
      role: "萌新",
      description: "古时代嘴炮",
    },
    {
      id: 40,
      name: "今夕_回忆1",
      image: "/40.png",
      role: "回忆",
      description: "待定",
    },
    {
      id: 41,
      name: "今夕_回忆2",
      image: "/41.png",
      role: "回忆",
      description: "待定",
    },
    {
      id: 42,
      name: "今夕_回忆3",
      image: "/42.png",
      role: "回忆",
      description: "待定",
    },
  ]

  // 管理团队 - 4人，ID 43-46
  const managementTeam = [
    {
      id: 43,
      name: "会长 · 今夕_执手",
      role: "统筹 · 战术指挥",
      avatar: "/43.png",
    },
    {
      id: 44,
      name: "副会 · 今夕_淡意",
      role: "训练 · 新人引导",
      avatar: "/44.png",
    },
    {
      id: 45,
      name: "战术官 · 今夕_恐龙",
      role: "阵容 · 地图位",
      avatar: "/45.png",
    },
    {
      id: 46,
      name: "外交 · 今夕_啵咕",
      role: "活动登记 · 积分",
      avatar: "/46.png",
    },
  ]

  const infoTabs = [
    {
      id: "about",
      label: "关于公会",
      icon: "ri-heart-2-line",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
❤️ 公会宣言
            </h4>
            <p className="text-white/80 text-sm mb-2">以战会友，彼此成就。强势在操作，温柔在态度。</p>
            <div className="text-yellow-300 font-medium text-sm">愿你每次出场，都被掌声围绕。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
⏰ 活跃时段
            </h4>
            <p className="text-white/80 text-sm mb-2">工作日 20:00–23:00；周末弹性开黑。</p>
            <div className="text-yellow-300 font-medium text-sm">如果星光不问赶路人，我们就把星光点亮。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
🛡️ 入会要点
            </h4>
            <p className="text-white/80 text-sm mb-2">文明游戏、支持指挥、接受分工。</p>
            <div className="text-yellow-300 font-medium text-sm">把"配合"写进肌肉记忆。</div>
          </div>
        </div>
      ),
    },
    {
      id: "news",
      label: "公告动态",
      icon: "ri-megaphone-line",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
📢 置顶公告
            </h4>
            <p className="text-white/80 text-sm mb-2">夏季冲榜进行中，组队排位、周常挑战、擂台切磋均可累计今夕积分。</p>
            <div className="text-yellow-300 font-medium text-sm">上分如风，稳住我们能赢。</div>
            <Progress value={75} className="mt-3" showLabel />
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
🏆 战绩速览
            </h4>
            <p className="text-white/80 text-sm mb-2">周冠军 ×2、跨区赛 Top10、公会任务连续满进度。</p>
            <div className="text-yellow-300 font-medium text-sm">胜利不是终点，它只是下一局的开场曲。</div>
          </div>
        </div>
      ),
    },
    {
      id: "events",
      label: "活动赛事",
      icon: "ri-calendar-event-line",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
👥 周常团练
            </h4>
            <p className="text-white/80 text-sm mb-2">周三/六晚 21:00，战术走位与默契磨合。</p>
            <div className="text-yellow-300 font-medium text-sm">同频的人，会在下一次转角相遇。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
🎮 友谊赛
            </h4>
            <p className="text-white/80 text-sm mb-2">跨会交流，礼貌第一；支持录屏剪辑高光。</p>
            <div className="text-yellow-300 font-medium text-sm">友谊第一，输出也要第一。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
🎬 混剪征集
            </h4>
            <p className="text-white/80 text-sm mb-2">征集精彩操作，季末发布「今夕混剪」。</p>
            <div className="text-yellow-300 font-medium text-sm">你的镜头，正在等待上场。</div>
          </div>
        </div>
      ),
    },
  ]

  const faqItems = [
    {
      id: "1",
      title: "新人多久能参加活动？",
      icon: "ri-question-line",
      content: "通常 1–3 天熟悉期，视配合度可更快。我们会安排专门的引导员帮助新成员快速融入团队。",
    },
    {
      id: "2",
      title: "要不要强制语音？",
      icon: "ri-mic-line",
      content: "战队赛建议语音，日常娱乐不强制。我们理解每个人的情况不同，会根据活动类型灵活安排。",
    },
    {
      id: "3",
      title: "公会有什么福利？",
      icon: "ri-gift-line",
      content: "定期组织内部比赛，优胜者有游戏道具奖励；节日活动礼品；技术指导和战术培训；温馨的游戏氛围。",
    },
    {
      id: "4",
      title: "如何提升在公会中的地位？",
      icon: "ri-arrow-up-line",
      content: "积极参与活动、帮助新人、展现良好的团队合作精神。我们重视每个成员的贡献，表现优秀者有机会晋升管理层。",
    },
  ]

  const toggleVideo = () => {
    const video = document.getElementById("heroVideo") as HTMLVideoElement
    if (video) {
      if (video.paused) {
        video.play()
        setIsVideoPlaying(true)
        toast.addToast("视频已开始播放", "info")
      } else {
        video.pause()
        setIsVideoPlaying(false)
        toast.addToast("视频已暂停", "info")
      }
    }
  }

  const handleJoinClick = () => {
    setIsModalOpen(true)
    toast.addToast("欢迎加入今夕公会！", "success")
  }

  useEffect(() => {
    // Set current year
    const yearElement = document.getElementById("y")
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear().toString()
    }

    // Simulate loading with memory monitoring
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false)
      // 显示内存使用情况（仅在开发模式）
      if (process.env.NODE_ENV === 'development') {
        const memoryUsage = getMemoryUsage()
        if (memoryUsage) {
          console.log('页面加载完成，内存使用:', {
            used: `${Math.round(memoryUsage.usedJSHeapSize! / 1024 / 1024)}MB`,
            total: `${Math.round(memoryUsage.totalJSHeapSize! / 1024 / 1024)}MB`
          })
        }
      }
    }, 2000)

    // 注册清理函数
    addCleanup(() => {
      clearTimeout(loadingTimeout)
    })
  }, [getMemoryUsage, addCleanup])



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 loading">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-white/80">正在加载今夕公会...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen relative bg-enhanced"
      style={{
        color: "#e8edf6",
        fontFamily:
          '"Noto Sans SC", system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      {/* 浮动气泡装饰 */}
      <FloatingBubbles />

      {/* 隐藏彩蛋系统 */}
      <HiddenEasterEggs />

      {/* </CHANGE> */}

      {/* Header */}
      <header
        className="sticky top-0 z-50 relative"
        style={{
          backdropFilter: "saturate(1.2) blur(8px)",
          background: "rgba(11,16,32,.6)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div className="max-w-[1180px] mx-auto px-4">
          <nav className="flex items-center justify-between h-[68px]">
            <ComponentLoader>
                <a href="#top" className="flex items-center gap-3 text-white no-underline">
                <OptimizedImage
                  src="/logo.png"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-xl object-cover"
                  priority={true}
                  quality={80}
                  unoptimized={true}
                />
                <h1
                  className="m-0 font-semibold text-lg tracking-wide"
                  style={{
                    fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                  }}
                >
                  弹弹堂 · 今夕公会
                </h1>
                </a>
            </ComponentLoader>

            <ul className="hidden md:flex gap-[18px] list-none m-0 p-0">
              {["关于", "公告", "活动", "成员", "展示墙", "成员列表", "签到", "留言墙", "攻略墙"].map((item, index) => {
                const links = ["about", "news", "events", "members", "roster", "members-page", "checkin", "message-wall", "strategy-wall"]
                const isStrategyWall = item === "攻略墙"

                return (
                    <li key={index}>
                      {isStrategyWall ? (
                        <button
                          onClick={() => setIsStrategyWallOpen(true)}
                          className="opacity-90 hover:opacity-100 no-underline transition-opacity bg-transparent border-none text-white cursor-pointer"
                        >
                          {item}
                        </button>
                      ) : (
                        <a
                          href={`#${links[index]}`}
                          className="opacity-90 hover:opacity-100 no-underline transition-opacity"
                        >
                          {item}
                        </a>
                      )}
                    </li>
                )
              })}
            </ul>

              <button
                onClick={handleJoinClick}
                className="cartoon-btn cartoon-btn-pink inline-flex items-center gap-2 px-[14px] py-[10px] rounded-xl border-none text-white no-underline transition-transform hover-effect"
              >
                <RocketIcon className="mr-2" size={18} /> 加入
              </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1180px] mx-auto px-4 relative z-10">
        {/* Hero Section */}
        <section className="py-16 pb-7 relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-7 items-center relative z-10">
            <ComponentLoader>
                <div
                className="p-6 rounded-2xl border relative"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                  <span
                    className="inline-flex items-center gap-2 px-3 py-[6px] rounded-full text-sm border mb-4 relative z-10"
                    style={{
                      background: "rgba(96,165,250,.18)",
                      color: "#cfe3ff",
                      borderColor: "rgba(96,165,250,.3)",
                    }}
                  >
✨ 今夕 · 欢迎回家
                  </span>

                <h2
                  className="my-2 font-bold text-[34px] leading-tight tracking-wide relative z-10 gradient-text-candy animate-bounce-in"
                  style={{
                    fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                  }}
                >
                  今晚开黑，星光作陪
                </h2>

                <p className="text-[#d5def0] mb-4 relative z-10">
                  组队、磨合、提升；每一局都有高光，每一次集合都有欢笑。
                </p>

                {/* 入会联系方式 */}
                <div className="mb-6 p-4 rounded-xl border relative z-10" style={{
                  background: "linear-gradient(180deg,rgba(96,165,250,.15),rgba(96,165,250,.05))",
                  borderColor: "rgba(96,165,250,.3)",
                }}>
                  <div className="flex items-center gap-2 mb-3">
👥
                    <span className="text-blue-200 font-medium text-sm">入会联系方式</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[#e1eafc]">
🐧
                      <span>QQ群：<strong className="text-blue-200">713162467</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-[#e1eafc]">
👤
                      <span>联系人：<strong className="text-blue-200">执手</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap relative z-10">
                  {[
                    { href: "#info-tabs", icon: "ri-megaphone-line", text: "公告", color: "sky" },
                    { href: "#info-tabs", icon: "ri-calendar-event-line", text: "活动", color: "fresh" },
                    { href: "#roster", icon: "ri-gallery-view-2", text: "展示墙", color: "sunset", primary: true },
                  ].map((btn, index) => (
                      <a
                        key={index}
                        href={btn.href}
                        className={`inline-flex items-center gap-2 px-[14px] py-[10px] rounded-xl border-none no-underline transition-transform ${
                          btn.primary ? `cartoon-btn cartoon-btn-${btn.color}` : "bg-white/5 hover:bg-white/10 border border-white/10"
                        }`}
                      >
                        {btn.icon === "ri-megaphone-line" ? "📢" : btn.icon === "ri-calendar-event-line" ? "📅" : btn.icon === "ri-gallery-view-2" ? "🖼️" : "📋"} {btn.text}
                      </a>
                  ))}
                </div>
                </div>
            </ComponentLoader>

            <ComponentLoader>
                <div
                  className="relative rounded-2xl overflow-hidden border aspect-[4/3]"
                  style={{
                    background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                    borderColor: "rgba(255,255,255,.1)",
                    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                    isolation: "isolate",
                  }}
                >
                  <video
                    id="heroVideo"
                    src="/1.MP4"
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                    loop
                    controls
                  />
                  <button
                    onClick={toggleVideo}
                    className="absolute right-[10px] bottom-[10px] z-10 inline-flex items-center gap-[6px] px-3 py-2 rounded-xl border text-white cursor-pointer hover:scale-110 transition-transform hover-effect"
                    style={{
                      borderColor: "rgba(255,255,255,.25)",
                      background: "rgba(0,0,0,.35)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
{isVideoPlaying ? "⏸️" : "▶️"}
                    {isVideoPlaying ? "暂停" : "播放"}
                  </button>

                  {/* Animated border effect */}
                  <div
                    className="absolute inset-[-1px] rounded-[calc(16px+2px)] opacity-70 pointer-events-none"
                    style={{
                      background: "conic-gradient(from 160deg at 30% 10%, #60a5fa, #22c55e, #f59e0b, #fb7185, #60a5fa)",
                      animation: "spin 10s linear infinite",
                      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      padding: "1px",
                    }}
                  />
                </div>
            </ComponentLoader>
          </div>
        </section>

        <ComponentLoader>
            <section id="info-tabs" className="py-9 relative">
              <div
                className="p-6 rounded-2xl border relative z-10"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                <ComponentLoader>
                  <Tabs tabs={infoTabs} defaultTab="about" />
                </ComponentLoader>
              </div>
            </section>
        </ComponentLoader>

        {/* Management Team Section with Enhanced Marquee */}
        <ComponentLoader>
            <section id="members" className="py-9 relative">
              <div
                className="p-6 rounded-2xl border relative"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                <h3
                  className="mt-0 mb-4 font-bold text-[26px] leading-tight flex items-center gap-2 relative z-10 gradient-text-sky"
                  style={{
                    fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                  }}
                >
⭐ 管理团队
                </h3>

                <ComponentLoader>
                  <Marquee className="py-4 relative z-10" pauseOnHover>
                    {managementTeam.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-[10px] p-3 rounded-xl mx-4 min-w-[280px] hover:scale-105 transition-transform"
                    style={{
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    <AvatarImage
                      src={member.avatar || "/placeholder.svg"}
                      alt={member.name}
                      size={36}
                      fallbackText={member.name}
                      loading="lazy"
                    />
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="text-sm" style={{ color: "#a5b2cc" }}>
                        {member.role}
                      </div>
                    </div>
                  </div>
                    ))}
                  </Marquee>
                </ComponentLoader>
              </div>
            </section>
        </ComponentLoader>

        <ComponentLoader>
            <section id="roster" className="py-9 relative">
              <h3
                className="mb-6 font-bold text-[26px] leading-tight flex items-center gap-2 relative z-10 gradient-text-fresh"
                style={{
                  fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                }}
              >
<ImageIcon className="inline" size={16} /> 成员展示
              </h3>
              <div
                className="p-6 rounded-2xl border relative z-10"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                <ComponentLoader>
                  <Carousel3D members={carouselMembers} />
                </ComponentLoader>
              </div>
            </section>
        </ComponentLoader>

        <ComponentLoader>
            <section id="members-page" className="py-9 relative">
              <h3
                className="mb-6 font-bold text-[26px] leading-tight flex items-center gap-2 text-center relative z-10 gradient-text-rainbow"
                style={{
                  fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                }}
              >
👥 公会成员列表
              </h3>
              <div
                className="p-6 rounded-2xl border relative z-10"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                <ComponentLoader>
                  <MemberGrid members={allMembers} />
                </ComponentLoader>
              </div>
            </section>
        </ComponentLoader>

        {/* 签到功能区域 */}
        <ComponentLoader>
            <section id="checkin" className="py-9 relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ComponentLoader>
                  <CheckinWidget />
                </ComponentLoader>
                <ComponentLoader>
                  <LeaderboardWidget />
                </ComponentLoader>
              </div>
            </section>
        </ComponentLoader>

        {/* 每日任务系统 */}
        <ComponentLoader>
            <section id="daily-tasks" className="py-9 relative">
              <DailyTasks />
            </section>
        </ComponentLoader>

        {/* 战队系统 */}
        <ComponentLoader>
            <section id="team-system" className="py-9 relative">
              <TeamSystem />
            </section>
        </ComponentLoader>

        {/* 游戏数据展示 */}
        <ComponentLoader>
            <section id="game-data" className="py-9 relative">
              <GameDataPanel />
            </section>
        </ComponentLoader>

        <ComponentLoader>
            <MessageWall />
        </ComponentLoader>

        <ComponentLoader>
            <section id="faq" className="py-9 relative">
              <h3
                className="mb-6 font-bold text-[26px] leading-tight flex items-center gap-2 relative z-10 gradient-text-fresh"
                style={{
                  fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                }}
              >
❓ 常见问题
              </h3>
              <div
                className="p-6 rounded-2xl border relative z-10"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                <ComponentLoader>
                  <Accordion items={faqItems} />
                </ComponentLoader>
              </div>
            </section>
        </ComponentLoader>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 relative z-10">
        <div className="max-w-[1180px] mx-auto px-4">
          <div className="flex items-center justify-center">
            <p className="text-white/80">
              © <span id="y">2018</span> 今夕公会
            </p>
          </div>
        </div>
      </footer>

      {/* 安全保护脚本 */}
      <script 
        dangerouslySetInnerHTML={{
          __html: `
            // 基础反调试保护
            (function() {
              // 禁用右键
              document.addEventListener('contextmenu', e => e.preventDefault());
              
              // 禁用开发者工具快捷键
              document.addEventListener('keydown', function(e) {
                if (e.key === 'F12' || 
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C')) ||
                    (e.ctrlKey && e.key === 'U')) {
                  e.preventDefault();
                }
              });
              
              // 控制台警告
              console.log('%c🔒 网站受到保护', 'color: red; font-size: 16px; font-weight: bold;');
              console.log('%c未经授权访问源代码是违法行为', 'color: orange; font-size: 12px;');
            })();
          `
        }}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="加入今夕公会" size="md">
        <div className="space-y-4">
          <p className="text-white/80">欢迎加入今夕公会！请填写以下信息，我们会尽快与您联系。</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="游戏昵称"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <input
              type="text"
              placeholder="联系方式 (QQ/微信/邮箱)"
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <select
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            >
              <option value="" className="bg-gray-800">
                选择常在线时段
              </option>
              <option value="工作日晚 20:00–23:00" className="bg-gray-800">
                工作日晚 20:00–23:00
              </option>
              <option value="周末白天" className="bg-gray-800">
                周末白天
              </option>
              <option value="周末晚上" className="bg-gray-800">
                周末晚上
              </option>
              <option value="不固定 / 看通知" className="bg-gray-800">
                不固定 / 看通知
              </option>
            </select>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            >
              <option value="" className="bg-gray-800">
                选择偏好定位
              </option>
              <option value="远程输出" className="bg-gray-800">
                远程输出
              </option>
              <option value="位移控制" className="bg-gray-800">
                位移控制
              </option>
              <option value="辅助/功能" className="bg-gray-800">
                辅助/功能
              </option>
              <option value="都行" className="bg-gray-800">
                都行
              </option>
            </select>
            <textarea
              placeholder="想说的话（选填）"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60 resize-none"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-xl border-none text-white font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)",
              }}
            >
<SendIcon className="mr-2" size={16} />
              {isSubmitting ? '发送中...' : '提交申请'}
            </button>
            <button
              onClick={handleMailtoFallback}
              className="px-6 py-3 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
              style={{ borderColor: "rgba(255,255,255,.2)" }}
              title="使用本地邮箱客户端发送"
            >
<MailIcon className="mr-1" size={16} />
              邮箱
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
              style={{ borderColor: "rgba(255,255,255,.2)" }}
            >
              取消
            </button>
          </div>
        </div>
      </Modal>

      {/* 攻略墙弹窗 */}
      <ComponentLoader>
        <StrategyWall
          isOpen={isStrategyWallOpen}
          onClose={() => setIsStrategyWallOpen(false)}
        />
      </ComponentLoader>




        </div>
  )
}

export default function Page() {
  return (
    <ToastProvider>
      <PageContent />
    </ToastProvider>
  )
}
