import { cn } from "@/lib/utils"
import { Marquee } from "@/components/magicui/marquee"

const guildMembers = [
  {
    name: "今夕_执手",
    username: "会长",
    body: "统筹全局，战术指挥。愿每次出场，都被掌声围绕。",
    img: "https://avatar.vercel.sh/zhishou",
  },
  {
    name: "今夕_淡意",
    username: "副会长",
    body: "训练新人，引导成长。同频的人，会在下一次转角相遇。",
    img: "https://avatar.vercel.sh/danyi",
  },
  {
    name: "今夕_恐龙",
    username: "战术官",
    body: "阵容分析，地图位控制。把配合写进肌肉记忆。",
    img: "https://avatar.vercel.sh/konglong",
  },
  {
    name: "今夕_啵咕",
    username: "外交",
    body: "活动登记，积分管理。上分如风，稳住我们能赢。",
    img: "https://avatar.vercel.sh/bogu",
  },
  {
    name: "今夕_星辰",
    username: "火力手",
    body: "远程输出，精准打击。胜利不是终点，是下一局的开场曲。",
    img: "https://avatar.vercel.sh/xingchen",
  },
  {
    name: "今夕_流光",
    username: "控位",
    body: "位移控制，节奏掌控。友谊第一，输出也要第一。",
    img: "https://avatar.vercel.sh/liuguang",
  },
]

const firstRow = guildMembers.slice(0, guildMembers.length / 2)
const secondRow = guildMembers.slice(guildMembers.length / 2)

const MemberCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string
  name: string
  username: string
  body: string
}) => {
  return (
    <figure
      className={cn(
        "relative h-full w-72 cursor-pointer overflow-hidden rounded-xl border p-4 transition-all duration-300",
        // light styles
        "border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 hover:from-blue-100/90 hover:to-indigo-100/90",
        // dark styles
        "dark:border-blue-400/20 dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900/80 dark:hover:from-slate-700/90 dark:hover:to-slate-800/90",
        // gaming glow effect
        "hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div className="relative">
          <img
            className="rounded-full border-2 border-blue-400/30"
            width="40"
            height="40"
            alt=""
            src={img || "/placeholder.svg"}
          />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-800"></div>
        </div>
        <div className="flex flex-col">
          <figcaption className="text-sm font-semibold text-slate-800 dark:text-white">{name}</figcaption>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{username}</p>
        </div>
      </div>
      <blockquote className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{body}</blockquote>
    </figure>
  )
}

export default function GuildMembersMarquee() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">今夕公会 · 管理团队</h3>
        <p className="text-slate-600 dark:text-slate-400">以战会友，彼此成就</p>
      </div>

      <Marquee pauseOnHover className="[--duration:25s] [--gap:1.5rem]">
        {firstRow.map((member) => (
          <MemberCard key={member.name} {...member} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:25s] [--gap:1.5rem] mt-4">
        {secondRow.map((member) => (
          <MemberCard key={member.name} {...member} />
        ))}
      </Marquee>

      {/* Enhanced gradient overlays for better visual effect */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-slate-50 dark:from-slate-900"></div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-slate-50 dark:from-slate-900"></div>
    </div>
  )
}
