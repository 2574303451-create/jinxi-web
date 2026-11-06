"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { LoadingSpinner } from "../components/ui/loading-spinner"
import { ToastProvider, useToast } from "../components/ui/toast"
import { sendRecruitmentEmail, RecruitmentData } from "../components/email-service"
import { Modal } from "../components/ui/modal"
import { SendIcon, MailIcon } from "../components/ui/icons"
import { GuildNavigation } from "../components/home/guild-navigation"
import { GuildHero } from "../components/home/guild-hero"
import { GuildIntroduction, MemberActions, JoinBanner, SectionHeading, type MemberAction } from "../components/home/guild-sections"
import { GuildManagement, GuildMembers } from "../components/home/guild-members"
import { CommunityUpdates } from "../components/home/community-updates"
import { MessageShowcase } from "../components/home/message-showcase"
import { GuildFacts } from "../components/home/guild-facts"
import { FeaturedGuides } from "../components/home/featured-guides"
import { CyberAnnouncement } from "../components/cyber-announcement"
import { MotionConfig } from "framer-motion"
import dynamic from "next/dynamic"
const GuildUptimeTerminal = dynamic(() => import("../components/guild-uptime-terminal").then(m => m.GuildUptimeTerminal), { ssr: false })
import { GuildSponsorship } from "../components/guild-sponsorship"


// 动态导入重型组件以减少初始内存占用
const MessageWall = lazy(() => import("../components/message-wall").then(m => ({ default: m.MessageWall })))
const Carousel3D = lazy(() => import("../components/magicui/3d-carousel").then(m => ({ default: m.Carousel3D })))
const MemberGrid = lazy(() => import("../components/magicui/member-grid").then(m => ({ default: m.MemberGrid })))
const Accordion = lazy(() => import("../components/ui/accordion").then(m => ({ default: m.Accordion })))
const DailyTasks = lazy(() => import("../components/daily-tasks"))
const TeamSystem = lazy(() => import("../components/team-system"))
const GameDataPanel = lazy(() => import("../components/game-data-panel"))

// 组件加载占位符
const ComponentLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div role="status" className="module-loading flex items-center justify-center py-8">
      <LoadingSpinner size="sm" />
      <span className="ml-2">正在加载，请稍候…</span>
    </div>
  }>
    {children}
  </Suspense>
)

const LEGACY_MEMBER_AUTH_READY = false
function PageContent() {
  const [activePanel, setActivePanel] = useState<MemberAction | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const legacyPanel = activePanel !== null && !["messages", "members", "showcase"].includes(activePanel)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loginAccount, setLoginAccount] = useState("")
  const [loginNickname, setLoginNickname] = useState("")
  const [loginError, setLoginError] = useState("")
  const [changePasswordError, setChangePasswordError] = useState("")
  const [authMode, setAuthMode] = useState<"login" | "changePassword">("login")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loginForm, setLoginForm] = useState({
    account: "",
    password: "",
  })
  const [changePasswordForm, setChangePasswordForm] = useState({
    account: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  
  // 招新表单数据
  const [formData, setFormData] = useState<RecruitmentData>({
    nickname: '',
    contact: '',
    time: '',
    role: '',
    message: ''
  })
  const toast = useToast()

  const AUTH_ACCOUNT_KEY = "jinxi-auth-account"
  const AUTH_PROFILE_KEY = "jinxi-auth-profile"

  const persistAuthProfile = (profile: { account: string; nickname?: string; employeeNo?: string; forceResetPassword?: boolean }) => {
    if (typeof window === "undefined") return

    const normalized = {
      account: profile.account,
      nickname: profile.nickname || profile.account,
      employeeNo: profile.employeeNo || "",
      forceResetPassword: !!profile.forceResetPassword,
    }
    localStorage.setItem(AUTH_ACCOUNT_KEY, normalized.account)
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new Event("jinxi-auth-changed"))
  }

  const clearAuthProfile = () => {
    if (typeof window === "undefined") return
    localStorage.removeItem(AUTH_ACCOUNT_KEY)
    localStorage.removeItem(AUTH_PROFILE_KEY)
    window.dispatchEvent(new Event("jinxi-auth-changed"))
  }

  const syncLoginState = () => {
    if (typeof window === "undefined") return
    let resolvedAccount = localStorage.getItem(AUTH_ACCOUNT_KEY) || ""
    const rawProfile = localStorage.getItem(AUTH_PROFILE_KEY)

    let nickname = resolvedAccount
    if (rawProfile) {
      try {
        const profile = JSON.parse(rawProfile)
        const profileAccount = String(profile?.account || "").trim()
        if (!resolvedAccount && profileAccount) {
          resolvedAccount = profileAccount
          localStorage.setItem(AUTH_ACCOUNT_KEY, resolvedAccount)
        }
        if (profileAccount && profileAccount === resolvedAccount) {
          nickname = String(profile.nickname || profileAccount)
        }
      } catch {
        // ignore invalid local profile
      }
    }

    setLoginAccount(resolvedAccount)
    setLoginNickname(resolvedAccount ? nickname || resolvedAccount : "")
  }

  const handleLoginInputChange = (field: "account" | "password", value: string) => {
    setLoginForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleChangePasswordInputChange = (
    field: "currentPassword" | "newPassword" | "confirmPassword",
    value: string
  ) => {
    setChangePasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetAuthModalState = () => {
    setLoginError("")
    setChangePasswordError("")
    setShowLoginPassword(false)
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setLoginForm({ account: "", password: "" })
    setChangePasswordForm({
      account: loginAccount,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  const openLoginModal = () => {
    setAuthMode("login")
    setLoginError("")
    setChangePasswordError("")
    setLoginForm((prev) => ({ ...prev, account: loginAccount || "" }))
    setIsLoginModalOpen(true)
  }

  const openChangePasswordModal = () => {
    setAuthMode("changePassword")
    setLoginError("")
    setChangePasswordError("")
    setChangePasswordForm({
      account: loginAccount,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    setIsLoginModalOpen(true)
  }

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError("")
    if (!LEGACY_MEMBER_AUTH_READY) { setLoginError("正式登录正在安全升级，旧入口暂不接受密码。"); return }

    if (!loginForm.account.trim() || !loginForm.password.trim()) {
      setLoginError("请输入账号和密码")
      return
    }

    setIsLoginSubmitting(true)
    try {
      const response = await fetch("/.netlify/functions/auth-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account: loginForm.account.trim(),
          password: loginForm.password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) {
        const msg = data?.error || `登录失败 (${response.status})`
        setLoginError(msg)
        return
      }

      const profile = {
        account: data.account || loginForm.account.trim(),
        nickname: data.nickname || data.account || loginForm.account.trim(),
        employeeNo: data.employeeNo || "",
        forceResetPassword: !!data.forceResetPassword,
      }
      persistAuthProfile(profile)
      setLoginAccount(profile.account)
      setLoginNickname(profile.nickname)

      if (profile.forceResetPassword) {
        setAuthMode("changePassword")
        setChangePasswordForm({
          account: profile.account,
          currentPassword: loginForm.password,
          newPassword: "",
          confirmPassword: "",
        })
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
        setLoginError("")
        toast.addToast("首次登录请先修改密码", "info")
      } else {
        setIsLoginModalOpen(false)
        resetAuthModalState()
        toast.addToast(`登录成功：${profile.nickname}`, "success")
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "登录失败，请稍后重试")
    } finally {
      setIsLoginSubmitting(false)
    }
  }

  const handleChangePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setChangePasswordError("")
    if (!LEGACY_MEMBER_AUTH_READY) { setChangePasswordError("正式密码变更暂未开放，请保留现有资料。"); return }

    const account = loginAccount || changePasswordForm.account
    if (!account) {
      setChangePasswordError("请先登录账号后再修改密码")
      return
    }
    if (!changePasswordForm.currentPassword.trim()) {
      setChangePasswordError("请输入当前密码")
      return
    }
    if (changePasswordForm.newPassword.length < 8) {
      setChangePasswordError("新密码至少需要 8 位")
      return
    }
    if (!/[A-Za-z]/.test(changePasswordForm.newPassword) || !/\d/.test(changePasswordForm.newPassword)) {
      setChangePasswordError("新密码需包含字母和数字")
      return
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setChangePasswordError("两次输入的新密码不一致")
      return
    }
    if (changePasswordForm.currentPassword === changePasswordForm.newPassword) {
      setChangePasswordError("新密码不能与当前密码相同")
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch("/.netlify/functions/auth-change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account,
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) {
        const msg = data?.error || `修改密码失败 (${response.status})`
        setChangePasswordError(msg)
        return
      }

      const profile = {
        account: data.account || account,
        nickname: data.nickname || loginNickname || account,
        employeeNo: data.employeeNo || "",
        forceResetPassword: false,
      }
      persistAuthProfile(profile)
      setLoginAccount(profile.account)
      setLoginNickname(profile.nickname)
      setIsLoginModalOpen(false)
      setAuthMode("login")
      setLoginError("")
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setChangePasswordForm({
        account: profile.account,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setLoginForm({
        account: profile.account,
        password: "",
      })
      setChangePasswordError("")
      toast.addToast("密码修改成功", "success")
    } catch (error) {
      setChangePasswordError(error instanceof Error ? error.message : "修改密码失败，请稍后重试")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = () => {
    clearAuthProfile()
    setLoginAccount("")
    setLoginNickname("")
    setLoginError("")
    setChangePasswordError("")
    setAuthMode("login")
    setLoginForm({ account: "", password: "" })
    setChangePasswordForm({
      account: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    toast.addToast("已退出登录", "info")
  }

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
  }, [])

  useEffect(() => {
    syncLoginState()
    if (typeof window === "undefined") return

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_ACCOUNT_KEY || event.key === AUTH_PROFILE_KEY) {
        syncLoginState()
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("jinxi-auth-changed", syncLoginState as EventListener)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("jinxi-auth-changed", syncLoginState as EventListener)
    }
  }, [])
  return (
    <div
      className="jinxi-site min-h-screen relative"
    >
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <GuildNavigation account={LEGACY_MEMBER_AUTH_READY ? loginAccount : ""} nickname={loginNickname} onLogin={openLoginModal}
        onPassword={openChangePasswordModal} onLogout={handleLogout} onJoin={handleJoinClick}
        onAnnouncement={() => window.dispatchEvent(new Event("cyber-announcement:open"))} />
      <main id="main-content">
        <GuildHero onJoin={handleJoinClick} onActions={() => document.getElementById("actions")?.scrollIntoView()} />
        <GuildFacts />
        <GuildIntroduction onAnnouncement={() => window.dispatchEvent(new Event("cyber-announcement:open"))} />
        <GuildManagement members={managementTeam} onJoin={handleJoinClick} />
        <GuildMembers members={allMembers} onAll={() => setActivePanel("members")} onShowcase={() => setActivePanel("showcase")} />
        <MemberActions account={loginAccount} onOpen={setActivePanel} />
        <FeaturedGuides />
        <section id="community" className="guild-shell guild-section">
          <SectionHeading label="公会交流" title="好故事，值得一起分享" description="看看公会动态，留下你的声音，再分享一点实战经验。" />
          <CommunityUpdates onAnnouncement={() => window.dispatchEvent(new Event("cyber-announcement:open"))} onMessages={() => { setSelectedMessageId(null); setActivePanel("messages") }} />
          <MessageShowcase onOpen={(id) => { setSelectedMessageId(id || null); setActivePanel("messages") }} />
        </section>
        <section id="faq" className="guild-shell guild-section">
          <SectionHeading label="想了解更多" title="入会前，你可能想问" description="活动时间、奖励和具体安排，请以公会实际通知为准。" />
          <div className="guild-panel faq-panel legacy-module"><ComponentLoader><Accordion items={faqItems} /></ComponentLoader></div>
        </section>
        <JoinBanner onJoin={handleJoinClick} />
      </main>
      <CyberAnnouncement />
      <GuildUptimeTerminal />
      <GuildSponsorship />
      <footer className="guild-footer"><div className="guild-shell"><a className="guild-brand" href="#top"><img src="/logo.png" alt="" width={32} height={32} /><span>今夕公会</span></a><p>以战会友，彼此成就。一起记录属于我们的高光。</p><div><span>© <span id="y">2026</span> 今夕公会</span><a href="#top">回到顶部 ↑</a></div></div></footer>
      <Modal isOpen={activePanel !== null} onClose={() => setActivePanel(null)} title={activePanel ? { checkin: "每日签到", tasks: "每日任务", points: "积分与排行", teams: "寻找队伍", game: "游戏数据", messages: "留下你的声音", members: "公会成员", showcase: "成员精彩展示" }[activePanel] : ""} size="2xl" legacy={legacyPanel}>
        <div className={legacyPanel ? "legacy-module" : undefined}>
          <ComponentLoader>
            {activePanel === "checkin" && <p className="paper-notice" role="status">签到和历史记录查询正在安全升级。恢复后以服务器记录为准。</p>}
            {activePanel === "points" && <p className="paper-notice" role="status">积分余额、兑换和排行榜正在安全升级。暂不可查询，已有积分以服务器记录为准。</p>}
            {activePanel === "tasks" && <DailyTasks />}
            {activePanel === "teams" && <TeamSystem />}
            {activePanel === "game" && (loginAccount ? <><p className="module-notice">当前浏览器的本地游戏记录与默认示例，供个人参考。</p><GameDataPanel /></> : <div className="guild-empty"><h3>你的游戏记录</h3><p>登录后打开本地游戏数据面板。</p><button className="guild-button yellow" onClick={openLoginModal}>登录后查看</button></div>)}
            {activePanel === "members" && <MemberGrid members={allMembers} />}
            {activePanel === "showcase" && <Carousel3D members={carouselMembers} />}
            {activePanel === "messages" && <MessageWall writesPaused loggedInAccount={loginAccount} loggedInNickname={loginNickname} initialMessageId={selectedMessageId} />}
          </ComponentLoader>
        </div>
      </Modal>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="加入今夕公会" size="md">
        <div className="space-y-4">
          <p className="text-white/80">欢迎加入今夕公会！请填写以下信息，我们会尽快与您联系。</p>
          <div className="space-y-3">
            <input
              type="text"
              aria-label="游戏昵称" placeholder="游戏昵称"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <input
              type="text"
              aria-label="联系方式 (QQ/微信/邮箱)" placeholder="联系方式 (QQ/微信/邮箱)"
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <select aria-label="常在线时段"
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
            <select aria-label="偏好定位"
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
              aria-label="想说的话（选填）" placeholder="想说的话（选填）"
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

      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false)
          setAuthMode("login")
          resetAuthModalState()
        }}
        title={authMode === "login" ? "账号登录" : "修改密码"}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login")
                setChangePasswordError("")
              }}
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                authMode === "login" ? "bg-emerald-600 text-white" : "text-white/70 hover:text-white"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("changePassword")
                setLoginError("")
                setChangePasswordForm((prev) => ({
                  ...prev,
                  account: loginAccount || prev.account || loginForm.account.trim(),
                }))
              }}
              className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                authMode === "changePassword" ? "bg-blue-600 text-white" : "text-white/70 hover:text-white"
              }`}
            >
              修改密码
            </button>
          </div>

          {authMode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <p className="text-white/80 text-sm" role="status">正式登录与改密正在安全升级，旧入口暂未开放。阅读与本机草稿仍可使用。</p>
              {loginError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {loginError}
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="text"
                  aria-label="账号" placeholder="账号"
                  value={loginForm.account}
                  onChange={(e) => handleLoginInputChange("account", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
                  style={{ borderColor: "rgba(255,255,255,.14)" }}
                  autoComplete="username"
                />
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    aria-label="密码" placeholder="密码"
                    value={loginForm.password}
                    onChange={(e) => handleLoginInputChange("password", e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border bg-white/5 text-white placeholder-white/60"
                    style={{ borderColor: "rgba(255,255,255,.14)" }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                    aria-label={showLoginPassword ? "隐藏密码" : "显示密码"}
                  >
                    <i className={showLoginPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("changePassword")
                    setChangePasswordForm((prev) => ({
                      ...prev,
                      account: loginForm.account.trim() || loginAccount || prev.account,
                    }))
                  }}
                  className="text-blue-300 hover:text-blue-200 transition-colors"
                >
                  需要修改密码？
                </button>
                <span className="text-white/50">登录后将显示昵称</span>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoginSubmitting || !LEGACY_MEMBER_AUTH_READY}
                  className="flex-1 px-6 py-3 rounded-xl border-none text-white font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(180deg,#22c55e,#15803d)",
                  }}
                >
                  {isLoginSubmitting ? "登录中..." : "登录"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false)
                    setAuthMode("login")
                    resetAuthModalState()
                  }}
                  className="px-6 py-3 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
                  style={{ borderColor: "rgba(255,255,255,.2)" }}
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <p className="text-white/80 text-sm" role="status">密码变更正在安全升级。正式成员会话开放后，可在这里修改密码。</p>
              {changePasswordError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {changePasswordError}
                </div>
              )}
              <div className="space-y-3">
                <input
                  type="text"
                  aria-label="账号" placeholder="账号"
                  value={loginAccount || changePasswordForm.account}
                  onChange={(e) => setChangePasswordForm((prev) => ({ ...prev, account: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
                  style={{ borderColor: "rgba(255,255,255,.14)" }}
                  autoComplete="username"
                  readOnly={!!loginAccount}
                />
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    aria-label="当前密码" placeholder="当前密码"
                    value={changePasswordForm.currentPassword}
                    onChange={(e) => handleChangePasswordInputChange("currentPassword", e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border bg-white/5 text-white placeholder-white/60"
                    style={{ borderColor: "rgba(255,255,255,.14)" }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                    aria-label={showCurrentPassword ? "隐藏当前密码" : "显示当前密码"}
                  >
                    <i className={showCurrentPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="新密码（至少 8 位，含字母+数字）"
                    value={changePasswordForm.newPassword}
                    onChange={(e) => handleChangePasswordInputChange("newPassword", e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border bg-white/5 text-white placeholder-white/60"
                    style={{ borderColor: "rgba(255,255,255,.14)" }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                    aria-label={showNewPassword ? "隐藏新密码" : "显示新密码"}
                  >
                    <i className={showNewPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    aria-label="确认新密码" placeholder="确认新密码"
                    value={changePasswordForm.confirmPassword}
                    onChange={(e) => handleChangePasswordInputChange("confirmPassword", e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border bg-white/5 text-white placeholder-white/60"
                    style={{ borderColor: "rgba(255,255,255,.14)" }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                    aria-label={showConfirmPassword ? "隐藏确认密码" : "显示确认密码"}
                  >
                    <i className={showConfirmPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword || !LEGACY_MEMBER_AUTH_READY}
                  className="flex-1 px-6 py-3 rounded-xl border-none text-white font-medium hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(180deg,#2563eb,#1d4ed8)",
                  }}
                >
                  {isChangingPassword ? "修改中..." : "确认修改"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login")
                    setChangePasswordError("")
                    setChangePasswordForm((prev) => ({
                      ...prev,
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    }))
                  }}
                  className="px-6 py-3 rounded-xl border bg-white/5 hover:bg-white/10 transition-colors"
                  style={{ borderColor: "rgba(255,255,255,.2)" }}
                >
                  返回
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>





        </div>
  )
}

export default function Page() {
  return (
    <ToastProvider>
      <MotionConfig reducedMotion="user"><PageContent /></MotionConfig>
    </ToastProvider>
  )
}
