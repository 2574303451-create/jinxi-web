"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Reaction {
  type: string
  count: number
  users: string[]
}

interface Reply {
  id: string
  name: string
  content: string
  timestamp: Date
  color: string
}

interface Message {
  id: string
  name: string
  content: string
  timestamp: Date
  color: string
  reactions: Reaction[]
  replies: Reply[]
  category: string
  isPinned: boolean
}

export function MessageWall() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userName, setUserName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [messageCategory, setMessageCategory] = useState("general")

  const colors = ["#60a5fa", "#22c55e", "#f59e0b", "#fb7185", "#a78bfa", "#34d399"]
  const categories = ["general", "recruitment", "events", "feedback", "showcase"]
  const reactions = ["👍", "❤️", "😄", "🎉", "🔥", "💯"]

  useEffect(() => {
    // Load messages from localStorage
    const savedMessages = localStorage.getItem("guild-messages")
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages)
      // Convert timestamp strings back to Date objects
      const messagesWithDates = parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        replies:
          msg.replies?.map((reply: any) => ({
            ...reply,
            timestamp: new Date(reply.timestamp),
          })) || [],
      }))
      setMessages(messagesWithDates)
    }
  }, [])

  const saveMessages = (updatedMessages: Message[]) => {
    setMessages(updatedMessages)
    localStorage.setItem("guild-messages", JSON.stringify(updatedMessages))
  }

  const addMessage = () => {
    if (!newMessage.trim() || !userName.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      name: userName.trim(),
      content: newMessage.trim(),
      timestamp: new Date(),
      color: colors[Math.floor(Math.random() * colors.length)],
      reactions: [],
      replies: [],
      category: messageCategory,
      isPinned: false,
    }

    const updatedMessages = [message, ...messages].slice(0, 100) // Keep only latest 100 messages
    saveMessages(updatedMessages)
    setNewMessage("")
  }

  const addReply = (messageId: string) => {
    if (!replyContent.trim() || !userName.trim()) return

    const reply: Reply = {
      id: Date.now().toString(),
      name: userName.trim(),
      content: replyContent.trim(),
      timestamp: new Date(),
      color: colors[Math.floor(Math.random() * colors.length)],
    }

    const updatedMessages = messages.map((msg) =>
      msg.id === messageId ? { ...msg, replies: [...msg.replies, reply] } : msg,
    )

    saveMessages(updatedMessages)
    setReplyContent("")
    setReplyingTo(null)
  }

  const toggleReaction = (messageId: string, reactionType: string) => {
    if (!userName.trim()) return

    const updatedMessages = messages.map((msg) => {
      if (msg.id !== messageId) return msg

      const existingReaction = msg.reactions.find((r) => r.type === reactionType)

      if (existingReaction) {
        if (existingReaction.users.includes(userName)) {
          // Remove user's reaction
          const updatedReaction = {
            ...existingReaction,
            count: existingReaction.count - 1,
            users: existingReaction.users.filter((u) => u !== userName),
          }
          return {
            ...msg,
            reactions:
              updatedReaction.count > 0
                ? msg.reactions.map((r) => (r.type === reactionType ? updatedReaction : r))
                : msg.reactions.filter((r) => r.type !== reactionType),
          }
        } else {
          // Add user's reaction
          return {
            ...msg,
            reactions: msg.reactions.map((r) =>
              r.type === reactionType ? { ...r, count: r.count + 1, users: [...r.users, userName] } : r,
            ),
          }
        }
      } else {
        // Create new reaction
        return {
          ...msg,
          reactions: [...msg.reactions, { type: reactionType, count: 1, users: [userName] }],
        }
      }
    })

    saveMessages(updatedMessages)
  }

  const togglePin = (messageId: string) => {
    const updatedMessages = messages.map((msg) => (msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg))
    saveMessages(updatedMessages)
  }

  const deleteMessage = (messageId: string) => {
    const updatedMessages = messages.filter((msg) => msg.id !== messageId)
    saveMessages(updatedMessages)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      addMessage()
    }
  }

  const handleReplyKeyPress = (e: React.KeyboardEvent, messageId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      addReply(messageId)
    }
  }

  const filteredMessages =
    selectedCategory === "all" ? messages : messages.filter((msg) => msg.category === selectedCategory)

  const pinnedMessages = filteredMessages.filter((msg) => msg.isPinned)
  const regularMessages = filteredMessages.filter((msg) => !msg.isPinned)
  const displayMessages = [...pinnedMessages, ...regularMessages]

  return (
    <section id="message-wall" className="py-9">
      <div
        className="p-6 rounded-2xl border"
        style={{
          background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
          borderColor: "rgba(255,255,255,.1)",
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        <h3
          className="mt-0 mb-6 font-bold text-[26px] leading-tight flex items-center gap-2"
          style={{
            fontFamily: '"ZCOOL KuaiLe", "Noto Sans SC", cursive',
          }}
        >
          <i className="ri-chat-3-line"></i> 留言墙
        </h3>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedCategory === "all" ? "bg-blue-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              全部
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedCategory === category
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {category === "general"
                  ? "日常"
                  : category === "recruitment"
                    ? "招新"
                    : category === "events"
                      ? "活动"
                      : category === "feedback"
                        ? "反馈"
                        : "展示"}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="你的昵称"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            />
            <select
              value={messageCategory}
              onChange={(e) => setMessageCategory(e.target.value)}
              className="px-4 py-3 rounded-xl border bg-white/5 text-white"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
            >
              {categories.map((category) => (
                <option key={category} value={category} className="bg-gray-800">
                  {category === "general"
                    ? "日常"
                    : category === "recruitment"
                      ? "招新"
                      : category === "events"
                        ? "活动"
                        : category === "feedback"
                          ? "反馈"
                          : "展示"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            <textarea
              placeholder="留下你的足迹..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-3 rounded-xl border bg-white/5 text-white placeholder-white/60 resize-none"
              style={{ borderColor: "rgba(255,255,255,.14)" }}
              rows={3}
            />
            <button
              onClick={addMessage}
              disabled={!newMessage.trim() || !userName.trim()}
              className="px-6 py-3 rounded-xl border-none text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
              style={{
                background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)",
              }}
            >
              <i className="ri-send-plane-2-line mr-2"></i>
              发送
            </button>
          </div>
        </div>

        {/* Messages Display */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          <AnimatePresence>
            {displayMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`p-4 rounded-xl border relative ${message.isPinned ? "ring-2 ring-yellow-500/50" : ""}`}
                style={{
                  background: message.isPinned ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)",
                  borderColor: "rgba(255,255,255,.08)",
                }}
              >
                {message.isPinned && (
                  <div className="absolute top-2 right-2">
                    <i className="ri-pushpin-fill text-yellow-500 text-sm"></i>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: message.color }}
                  >
                    {message.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-white">{message.name}</div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background:
                            message.category === "recruitment"
                              ? "#e53e3e"
                              : message.category === "events"
                                ? "#4299e1"
                                : message.category === "feedback"
                                  ? "#38a169"
                                  : message.category === "showcase"
                                    ? "#f59e0b"
                                    : "#6b7280",
                          color: "white",
                        }}
                      >
                        {message.category === "general"
                          ? "日常"
                          : message.category === "recruitment"
                            ? "招新"
                            : message.category === "events"
                              ? "活动"
                              : message.category === "feedback"
                                ? "反馈"
                                : "展示"}
                      </span>
                      <div className="text-xs opacity-60">{message.timestamp.toLocaleString("zh-CN")}</div>
                    </div>
                    <div className="text-white/90 leading-relaxed break-words">{message.content}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1">
                    {reactions.map((reaction) => {
                      const userReaction = message.reactions.find((r) => r.type === reaction)
                      const hasReacted = userReaction?.users.includes(userName) || false
                      return (
                        <button
                          key={reaction}
                          onClick={() => toggleReaction(message.id, reaction)}
                          className={`px-2 py-1 rounded-full text-sm transition-all hover:scale-110 ${
                            hasReacted ? "bg-blue-500/30 ring-1 ring-blue-500" : "bg-white/10 hover:bg-white/20"
                          }`}
                          disabled={!userName.trim()}
                        >
                          {reaction} {userReaction?.count || ""}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
                      className="text-xs text-white/60 hover:text-white/90 transition-colors"
                    >
                      <i className="ri-reply-line mr-1"></i>回复
                    </button>
                    <button
                      onClick={() => togglePin(message.id)}
                      className="text-xs text-white/60 hover:text-white/90 transition-colors"
                    >
                      <i className={`${message.isPinned ? "ri-pushpin-fill" : "ri-pushpin-line"} mr-1`}></i>
                      {message.isPinned ? "取消置顶" : "置顶"}
                    </button>
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      <i className="ri-delete-bin-line mr-1"></i>删除
                    </button>
                  </div>
                </div>

                {message.replies.length > 0 && (
                  <div className="ml-6 space-y-2 border-l-2 border-white/10 pl-4">
                    {message.replies.map((reply) => (
                      <motion.div
                        key={reply.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 p-2 rounded-lg bg-white/5"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{ background: reply.color }}
                        >
                          {reply.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-white text-sm">{reply.name}</div>
                            <div className="text-xs opacity-60">{reply.timestamp.toLocaleString("zh-CN")}</div>
                          </div>
                          <div className="text-white/80 text-sm leading-relaxed break-words">{reply.content}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <AnimatePresence>
                  {replyingTo === message.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 ml-6"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="回复内容..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyPress={(e) => handleReplyKeyPress(e, message.id)}
                          className="flex-1 px-3 py-2 rounded-lg border bg-white/5 text-white placeholder-white/60 text-sm"
                          style={{ borderColor: "rgba(255,255,255,.14)" }}
                          autoFocus
                        />
                        <button
                          onClick={() => addReply(message.id)}
                          disabled={!replyContent.trim() || !userName.trim()}
                          className="px-4 py-2 rounded-lg border-none text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform text-sm"
                          style={{
                            background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)",
                          }}
                        >
                          回复
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {displayMessages.length === 0 && (
            <div className="text-center py-8 opacity-60">
              <i className="ri-chat-3-line text-4xl mb-4 block"></i>
              <p>
                {selectedCategory === "all"
                  ? "还没有留言，快来抢沙发吧！"
                  : `暂无${
                      selectedCategory === "general"
                        ? "日常"
                        : selectedCategory === "recruitment"
                          ? "招新"
                          : selectedCategory === "events"
                            ? "活动"
                            : selectedCategory === "feedback"
                              ? "反馈"
                              : "展示"
                    }类别的留言`}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
