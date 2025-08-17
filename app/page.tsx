"use client"

import { useState, useEffect } from "react"
import { Marquee } from "@/components/magicui/marquee"
import { AnimatedBeam } from "@/components/magicui/animated-beam"
import { Sparkles } from "@/components/magicui/sparkles"
import { TypingAnimation } from "@/components/magicui/typing-animation"
import { MessageWall } from "@/components/message-wall"
import { Carousel3D } from "@/components/magicui/3d-carousel"
import { MemberGrid } from "@/components/magicui/member-grid"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { Modal } from "@/components/ui/modal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Accordion } from "@/components/ui/accordion"
import { Particles } from "@/components/magicui/particles"
import { FloatingElements } from "@/components/magicui/floating-elements"
import { AuroraBackground } from "@/components/magicui/aurora-background"
import { MeteorShower } from "@/components/magicui/meteor-shower"

function PageContent() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToast()

  const managementTeam = [
    {
      id: 1,
      name: "会长 · 今夕_执手",
      role: "统筹 · 战术指挥",
      avatar: "/1.png",
    },
    {
      id: 2,
      name: "副会 · 今夕_淡意",
      role: "训练 · 新人引导",
      avatar: "/2.png",
    },
    {
      id: 3,
      name: "战术官 · 今夕_恐龙",
      role: "阵容 · 地图位",
      avatar: "/3.png",
    },
    {
      id: 4,
      name: "后勤 · 今夕_啵咕",
      role: "活动登记 · 积分",
      avatar: "/4.png",
    },
  ]

  const allMembers = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `今夕_${i + 1}`,
    image: `/${(i % 4) + 1}.png`,
    role: i % 3 === 0 ? "火力" : i % 3 === 1 ? "控位" : "后勤",
    description:
      i % 3 === 0 ? "擅长远程输出和爆发伤害" : i % 3 === 1 ? "精通位移控制和战术配合" : "负责团队支援和资源管理",
  }))

  const carouselMembers = allMembers.slice(0, 12).map((member) => ({
    id: member.id,
    name: member.name,
    image: member.image,
    role: member.role,
  }))

  const infoTabs = [
    {
      id: "about",
      label: "关于公会",
      icon: "ri-heart-2-line",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="ri-heart-2-line text-red-400"></i> 公会宣言
            </h4>
            <p className="text-white/80 text-sm mb-2">以战会友，彼此成就。强势在操作，温柔在态度。</p>
            <div className="text-yellow-300 font-medium text-sm">愿你每次出场，都被掌声围绕。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="ri-time-line text-blue-400"></i> 活跃时段
            </h4>
            <p className="text-white/80 text-sm mb-2">工作日 20:00–23:00；周末弹性开黑。</p>
            <div className="text-yellow-300 font-medium text-sm">如果星光不问赶路人，我们就把星光点亮。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="ri-shield-star-line text-green-400"></i> 入会要点
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
              <i className="ri-megaphone-line text-orange-400"></i> 置顶公告
            </h4>
            <p className="text-white/80 text-sm mb-2">夏季冲榜进行中，组队排位、周常挑战、擂台切磋均可累计今夕积分。</p>
            <div className="text-yellow-300 font-medium text-sm">上分如风，稳住我们能赢。</div>
            <Progress value={75} className="mt-3" showLabel />
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="ri-trophy-line text-yellow-400"></i> 战绩速览
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
              <i className="ri-team-line text-purple-400"></i> 周常团练
            </h4>
            <p className="text-white/80 text-sm mb-2">周三/六晚 21:00，战术走位与默契磨合。</p>
            <div className="text-yellow-300 font-medium text-sm">同频的人，会在下一次转角相遇。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="ri-gamepad-line text-green-400"></i> 友谊赛
            </h4>
            <p className="text-white/80 text-sm mb-2">跨会交流，礼貌第一；支持录屏剪辑高光。</p>
            <div className="text-yellow-300 font-medium text-sm">友谊第一，输出也要第一。</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <i className="ri-movie-2-line text-red-400"></i> 混剪征集
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

    // Simulate loading
    setTimeout(() => setIsLoading(false), 2000)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-white/80">正在加载今夕公会...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        background: `
        linear-gradient(180deg, rgba(8,12,24,.72), rgba(8,12,24,.72)),
        url('/bg.png') center / cover no-repeat fixed,
        radial-gradient(1200px 800px at 90% -10%, #1b2a55 0%, transparent 60%),
        radial-gradient(1100px 650px at -10% 10%, #0f2b3f 0%, transparent 60%),
        linear-gradient(180deg, #0b1224, #0b1020)
      `,
        backgroundBlendMode: "normal, overlay, normal, normal, normal",
        color: "#e8edf6",
        fontFamily:
          '"Noto Sans SC", system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      <AuroraBackground className="fixed inset-0 z-0" />
      <Particles
        count={80}
        className="fixed inset-0 z-0"
        interactive={true}
        colors={["#60a5fa", "#22c55e", "#f59e0b", "#fb7185", "#a78bfa"]}
      />
      <FloatingElements count={15} className="fixed inset-0 z-0" />
      <MeteorShower count={8} className="fixed inset-0 z-0" />
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
            <AnimatedBeam delay={0.2}>
              <a href="#top" className="flex items-center gap-3 text-white no-underline">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-10 h-10 rounded-xl object-cover"
                  style={{ boxShadow: "0 0 0 3px rgba(255,255,255,.08) inset" }}
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
            </AnimatedBeam>

            <ul className="hidden md:flex gap-[18px] list-none m-0 p-0">
              {["关于", "公告", "活动", "成员", "展示墙", "成员列表", "留言墙", "招新", "联系"].map((item, index) => (
                <AnimatedBeam key={index} delay={0.3 + index * 0.1}>
                  <li>
                    <a
                      href={`#${["about", "news", "events", "members", "roster", "members-page", "message-wall", "recruit", "contact"][index]}`}
                      className="opacity-90 hover:opacity-100 no-underline transition-opacity"
                    >
                      {item}
                    </a>
                  </li>
                </AnimatedBeam>
              ))}
            </ul>

            <AnimatedBeam delay={1.2}>
              <button
                onClick={handleJoinClick}
                className="inline-flex items-center gap-2 px-[14px] py-[10px] rounded-xl border-none text-white no-underline hover:scale-105 transition-transform"
                style={{
                  background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)",
                }}
              >
                <i className="ri-rocket-line"></i>加入
              </button>
            </AnimatedBeam>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1180px] mx-auto px-4 relative z-10">
        {/* Hero Section */}
        <section className="py-16 pb-7 relative">
          <FloatingElements count={8} className="absolute inset-0 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-7 items-center relative z-10">
            <AnimatedBeam delay={0.5}>
              <div
                className="p-6 rounded-2xl border relative"
                style={{
                  background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                  borderColor: "rgba(255,255,255,.1)",
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                <Particles
                  count={20}
                  className="absolute inset-0 rounded-2xl"
                  size={[0.5, 1.5]}
                  speed={[0.2, 0.8]}
                  colors={["#60a5fa80", "#22c55e80"]}
                />

                <Sparkles className="mb-4 relative z-10">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-[6px] rounded-full text-sm border"
                    style={{
                      background: "rgba(96,165,250,.18)",
                      color: "#cfe3ff",
                      borderColor: "rgba(96,165,250,.3)",
                    }}
                  >
                    <i className="ri-sparkling-2-line"></i> 今夕 · 欢迎回家
                  </span>
                </Sparkles>

                <TypingAnimation
                  text="今晚开黑，星光作陪"
                  className="my-2 font-bold text-[34px] leading-tight tracking-wide relative z-10"
                  style={{
                    fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                  }}
                />

                <p className="text-[#d5def0] mb-4 relative z-10">
                  组队、磨合、提升；每一局都有高光，每一次集合都有欢笑。
                </p>

                <div className="flex gap-3 flex-wrap relative z-10">
                  {[
                    { href: "#info-tabs", icon: "ri-megaphone-line", text: "公告" },
                    { href: "#info-tabs", icon: "ri-calendar-event-line", text: "活动" },
                    { href: "#roster", icon: "ri-gallery-view-2", text: "展示墙", primary: true },
                  ].map((btn, index) => (
                    <AnimatedBeam key={index} delay={1.5 + index * 0.2}>
                      <a
                        href={btn.href}
                        className={`inline-flex items-center gap-2 px-[14px] py-[10px] rounded-xl border no-underline hover:scale-105 transition-transform ${
                          btn.primary ? "border-none text-white" : ""
                        }`}
                        style={
                          btn.primary
                            ? { background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)" }
                            : {
                                background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                                borderColor: "rgba(255,255,255,.1)",
                              }
                        }
                      >
                        <i className={btn.icon}></i> {btn.text}
                      </a>
                    </AnimatedBeam>
                  ))}
                </div>
              </div>
            </AnimatedBeam>

            <AnimatedBeam delay={0.8}>
              <Sparkles density={12}>
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
                    className="absolute right-[10px] bottom-[10px] z-10 inline-flex items-center gap-[6px] px-3 py-2 rounded-xl border text-white cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      borderColor: "rgba(255,255,255,.25)",
                      background: "rgba(0,0,0,.35)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <i className={isVideoPlaying ? "ri-pause-mini-line" : "ri-play-mini-line"}></i>
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
              </Sparkles>
            </AnimatedBeam>
          </div>
        </section>

        <AnimatedBeam delay={1.0}>
          <section id="info-tabs" className="py-9 relative">
            <MeteorShower count={3} className="absolute inset-0 z-0" />

            <div
              className="p-6 rounded-2xl border relative z-10"
              style={{
                background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                borderColor: "rgba(255,255,255,.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            >
              <Tabs tabs={infoTabs} defaultTab="about" />
            </div>
          </section>
        </AnimatedBeam>

        {/* Management Team Section with Enhanced Marquee */}
        <AnimatedBeam delay={1.0}>
          <section id="members" className="py-9 relative">
            <div
              className="p-6 rounded-2xl border relative"
              style={{
                background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                borderColor: "rgba(255,255,255,.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            >
              <Particles
                count={15}
                className="absolute inset-0 rounded-2xl"
                size={[1, 2]}
                colors={["#60a5fa60", "#22c55e60", "#f59e0b60"]}
              />

              <h3
                className="mt-0 mb-4 font-bold text-[26px] leading-tight flex items-center gap-2 relative z-10"
                style={{
                  fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
                }}
              >
                <i className="ri-user-star-line"></i> 管理团队
              </h3>

              <Marquee className="py-4 relative z-10" pauseOnHover speed={40}>
                {managementTeam.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-[10px] p-3 rounded-xl mx-4 min-w-[280px] hover:scale-105 transition-transform"
                    style={{
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    <img
                      src={member.avatar || "/placeholder.svg"}
                      alt={member.name}
                      className="w-9 h-9 rounded-full object-cover"
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
            </div>
          </section>
        </AnimatedBeam>

        <AnimatedBeam delay={1.4}>
          <section id="roster" className="py-9 relative">
            <AuroraBackground className="absolute inset-0 z-0 opacity-30" />

            <h3
              className="mb-6 font-bold text-[26px] leading-tight flex items-center gap-2 relative z-10"
              style={{
                fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
              }}
            >
              <i className="ri-gallery-view-2"></i> 成员展示
            </h3>
            <div
              className="p-6 rounded-2xl border relative z-10"
              style={{
                background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                borderColor: "rgba(255,255,255,.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            >
              <Carousel3D members={carouselMembers} />
            </div>
          </section>
        </AnimatedBeam>

        <AnimatedBeam delay={1.6}>
          <section id="members-page" className="py-9 relative">
            <h3
              className="mb-6 font-bold text-[26px] leading-tight flex items-center gap-2 text-center relative z-10"
              style={{
                fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
              }}
            >
              <i className="ri-user-3-line"></i> 公会成员列表
            </h3>
            <div
              className="p-6 rounded-2xl border relative z-10"
              style={{
                background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                borderColor: "rgba(255,255,255,.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            >
              <MemberGrid members={allMembers} />
            </div>
          </section>
        </AnimatedBeam>

        <AnimatedBeam delay={1.2}>
          <MessageWall />
        </AnimatedBeam>

        <AnimatedBeam delay={1.8}>
          <section id="faq" className="py-9 relative">
            <h3
              className="mb-6 font-bold text-[26px] leading-tight flex items-center gap-2 relative z-10"
              style={{
                fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
              }}
            >
              <i className="ri-question-answer-line"></i> 常见问题
            </h3>
            <div
              className="p-6 rounded-2xl border relative z-10"
              style={{
                background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                borderColor: "rgba(255,255,255,.1)",
                boxShadow: "0 10px 30px rgba(0,0,0,.35)",
              }}
            >
              <Accordion items={faqItems} />
            </div>
          </section>
        </AnimatedBeam>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 relative z-10">
        <div className="max-w-[1180px] mx-auto px-4">
          <p>
            © <span id="y">2024</span> 今夕公会
          </p>
        </div>
      </footer>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="加入今夕公会" size="md">
        <div className="space-y-4">
          <p className="text-white/80">欢迎加入今夕公会！请填写以下信息，我们会尽快与您联系。</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="游戏昵称"
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <input
              type="text"
              placeholder="联系方式 (QQ/微信)"
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <select
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            >
              <option value="" className="bg-gray-800">
                选择偏好定位
              </option>
              <option value="fire" className="bg-gray-800">
                远程输出
              </option>
              <option value="control" className="bg-gray-800">
                位移控制
              </option>
              <option value="support" className="bg-gray-800">
                辅助/功能
              </option>
              <option value="any" className="bg-gray-800">
                都行
              </option>
            </select>
            <textarea
              placeholder="想说的话（选填）"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60 resize-none"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                toast.addToast("申请已提交，我们会尽快联系您！", "success")
                setIsModalOpen(false)
              }}
              className="flex-1 px-6 py-3 rounded-xl border-none text-white font-medium hover:scale-105 transition-transform"
              style={{
                background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)",
              }}
            >
              提交申请
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

      {/* Required CSS for icons */}
      <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&family=ZCOOL+KuaiLe&family=Ma+Shan+Zheng&display=swap"
        rel="stylesheet"
      />
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
