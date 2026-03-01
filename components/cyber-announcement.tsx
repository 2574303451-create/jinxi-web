"use client"

import { ChangeEvent, ClipboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type Announcement, fetchAnnouncements, postAnnouncement, verifyAnnouncementAdminToken } from "../services/announcement-service"
import { useToast } from "./ui/toast"
import styles from "./cyber-announcement.module.css"

interface CyberAnnouncementProps {
  isAdmin?: boolean
  adminTokenStorageKey?: string
}

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
}

const CYBER_EMOJIS = ["😀", "😎", "🤖", "🚀", "✨", "🔥", "🎯", "📢", "📌", "✅", "⚡", "🎉", "🧠", "🛰️", "🛠️", "💡"]

function isSafeImageSource(source: string) {
  return /^https?:\/\/\S+/i.test(source) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(source)
}

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function hasMeaningfulContent(contentHtml: string) {
  const compact = contentHtml
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim()
  return compact.length > 0 || /<img[\s>]/i.test(contentHtml)
}

function sanitizeAnnouncementHtml(inputHtml: string) {
  if (typeof window === "undefined") {
    return inputHtml
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(inputHtml, "text/html")

  doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove())

  doc.body.querySelectorAll("*").forEach((node) => {
    for (const attr of [...node.attributes]) {
      const key = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()

      if (key.startsWith("on")) {
        node.removeAttribute(attr.name)
      }

      if ((key === "href" || key === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attr.name)
      }
    }
  })

  return doc.body.innerHTML
}

function formatAnnouncementTime(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

function CyberRichEditor({ value, onChange }: RichEditorProps) {
  const toast = useToast()
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  const [isEmpty, setIsEmpty] = useState(true)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const [showImageUrlInput, setShowImageUrlInput] = useState(false)
  const [imageUrlDraft, setImageUrlDraft] = useState("")

  const syncEmptyState = useCallback((html: string) => {
    setIsEmpty(!hasMeaningfulContent(html))
  }, [])

  useEffect(() => {
    if (!editorRef.current) {
      return
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }

    syncEmptyState(value)
  }, [value, syncEmptyState])

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      return
    }

    const range = selection.getRangeAt(0)
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange()
    }
  }, [])

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !savedRangeRef.current) {
      return
    }

    selection.removeAllRanges()
    selection.addRange(savedRangeRef.current)
  }, [])

  const emitChange = useCallback(() => {
    const currentHtml = editorRef.current?.innerHTML ?? ""
    onChange(currentHtml)
    syncEmptyState(currentHtml)
  }, [onChange, syncEmptyState])

  const executeCommand = useCallback(
    (command: string, commandValue?: string) => {
      editorRef.current?.focus()
      restoreSelection()
      document.execCommand(command, false, commandValue)
      emitChange()
      saveSelection()
    },
    [emitChange, restoreSelection, saveSelection],
  )

  const insertHtml = useCallback(
    (html: string) => {
      editorRef.current?.focus()
      restoreSelection()
      document.execCommand("insertHTML", false, html)
      emitChange()
      saveSelection()
    },
    [emitChange, restoreSelection, saveSelection],
  )

  const insertImage = useCallback(
    (src: string, alt: string) => {
      if (!isSafeImageSource(src)) {
        toast.addToast("图片地址不合法，仅支持 http(s) 或 data:image", "warning")
        return
      }

      const safeSrc = escapeHtmlAttribute(src)
      const safeAlt = escapeHtmlAttribute(alt || "announcement-image")
      insertHtml(
        `<p><img src="${safeSrc}" alt="${safeAlt}" style="max-width:100%;height:auto;border-radius:10px;border:1px solid rgba(0,243,255,.35);margin:8px 0;" /></p><p><br></p>`,
      )
    },
    [insertHtml, toast],
  )

  const handleInput = useCallback(() => {
    emitChange()
    saveSelection()
  }, [emitChange, saveSelection])

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const clipboardItems = event.clipboardData?.items
      if (!clipboardItems?.length) {
        return
      }

      const imageItem = Array.from(clipboardItems).find((item) => item.type.startsWith("image/"))
      if (!imageItem) {
        return
      }

      const file = imageItem.getAsFile()
      if (!file) {
        return
      }

      event.preventDefault()
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = typeof reader.result === "string" ? reader.result : ""
        if (!base64) {
          toast.addToast("剪贴板图片读取失败", "error")
          return
        }

        // TODO: Replace Base64 storage with real OSS/S3 upload API and keep only returned URL.
        insertImage(base64, file.name || "clipboard-image")
      }
      reader.readAsDataURL(file)
    },
    [insertImage, toast],
  )

  const handleLocalFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) {
        return
      }

      if (!file.type.startsWith("image/")) {
        toast.addToast("仅支持图片文件", "warning")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = typeof reader.result === "string" ? reader.result : ""
        if (!base64) {
          toast.addToast("图片读取失败", "error")
          return
        }

        // TODO: Replace Base64 storage with real OSS/S3 upload API and keep only returned URL.
        insertImage(base64, file.name)
      }
      reader.readAsDataURL(file)
    },
    [insertImage, toast],
  )

  const handleInsertImageUrl = useCallback(() => {
    const source = imageUrlDraft.trim()
    if (!source) {
      toast.addToast("请输入图片 URL", "warning")
      return
    }

    insertImage(source, "url-image")
    setImageUrlDraft("")
    setShowImageUrlInput(false)
  }, [imageUrlDraft, insertImage, toast])

  return (
    <div className={styles.cyberAnnEditorWrap}>
      <div className={styles.cyberAnnToolbar}>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("bold")} title="加粗">
          B
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("italic")} title="斜体">
          I
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("underline")} title="下划线">
          U
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("formatBlock", "h2")} title="二级标题">
          H2
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("insertUnorderedList")} title="无序列表">
          •
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("insertOrderedList")} title="有序列表">
          1.
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("formatBlock", "blockquote")} title="引用块">
          "
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowEmojiPanel((prev) => !prev)} title="插入 Emoji">
          🙂
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowImageUrlInput((prev) => !prev)} title="插入图片 URL">
          URL
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} title="本地上传图片（Base64）">
          IMG
        </button>
        <span className={styles.cyberAnnToolHint}>提示: Win + . 可呼出系统 Emoji</span>
      </div>

      {showEmojiPanel ? (
        <div className={styles.cyberAnnEmojiPopover}>
          {CYBER_EMOJIS.map((emoji) => (
            <button key={emoji} type="button" className={styles.cyberAnnEmojiBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => insertHtml(emoji)} title={`插入 ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      {showImageUrlInput ? (
        <div className={styles.cyberAnnImageRow}>
          <input type="url" className={styles.cyberAnnUrlInput} value={imageUrlDraft} onChange={(event) => setImageUrlDraft(event.target.value)} placeholder="粘贴图片 URL（https://...）" />
          <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={handleInsertImageUrl}>
            插入
          </button>
        </div>
      ) : null}

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLocalFileChange} />

      <div
        ref={editorRef}
        className={styles.cyberAnnEditorSurface}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        data-empty={isEmpty}
        data-placeholder="输入公告内容，支持基础排版、Emoji、图片 URL、本地图片（Base64）..."
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={saveSelection}
      />
    </div>
  )
}

export function CyberAnnouncement({ isAdmin = false, adminTokenStorageKey = "jinxi_admin_token" }: CyberAnnouncementProps) {
  const toast = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const [tokenValidated, setTokenValidated] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)
  const [adminTokenInput, setAdminTokenInput] = useState("")
  const [adminToken, setAdminToken] = useState("")

  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [titleInput, setTitleInput] = useState("")
  const [contentHtml, setContentHtml] = useState("")

  const canManage = isAdmin || tokenValidated

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true)
    setLoadError("")
    try {
      const data = await fetchAnnouncements()
      setAnnouncements(data)
    } catch (error) {
      console.error("Failed to fetch announcements:", error)
      setLoadError(error instanceof Error ? error.message : "公告加载失败，请稍后重试。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAnnouncements()
  }, [loadAnnouncements])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleOpenPanel = () => setIsOpen(true)
    window.addEventListener("cyber-announcement:open", handleOpenPanel)

    return () => {
      window.removeEventListener("cyber-announcement:open", handleOpenPanel)
    }
  }, [])

  useEffect(() => {
    let active = true

    const run = async () => {
      if (isAdmin) {
        setTokenValidated(true)
        return
      }

      if (typeof window === "undefined") {
        return
      }

      const token = window.localStorage.getItem(adminTokenStorageKey) || ""
      if (!token) {
        if (active) {
          setTokenValidated(false)
          setAdminToken("")
        }
        return
      }

      try {
        const valid = await verifyAnnouncementAdminToken(token)
        if (active) {
          setTokenValidated(valid)
          setAdminToken(valid ? token : "")
        }

        if (!valid) {
          window.localStorage.removeItem(adminTokenStorageKey)
        }
      } catch (error) {
        console.error("Failed to verify announcement admin token:", error)
        if (active) {
          setTokenValidated(false)
          setAdminToken("")
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [isAdmin, adminTokenStorageKey])

  const displayAnnouncements = useMemo(
    () =>
      announcements.map((item) => ({
        ...item,
        safeHtml: sanitizeAnnouncementHtml(item.contentHtml),
      })),
    [announcements],
  )

  const handleVerifyAdmin = useCallback(async () => {
    const token = adminTokenInput.trim()
    if (!token) {
      toast.addToast("请输入管理员密码", "warning")
      return
    }

    setVerifyingToken(true)
    try {
      const valid = await verifyAnnouncementAdminToken(token)
      if (!valid) {
        toast.addToast("管理员认证失败", "error")
        return
      }

      setTokenValidated(true)
      setAdminToken(token)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(adminTokenStorageKey, token)
      }
      setAdminTokenInput("")
      toast.addToast("管理员认证成功", "success")
    } catch (error) {
      console.error("Failed to verify admin token:", error)
      toast.addToast("认证失败，请稍后再试", "error")
    } finally {
      setVerifyingToken(false)
    }
  }, [adminTokenInput, adminTokenStorageKey, toast])

  const handleLogoutAdmin = useCallback(() => {
    setTokenValidated(false)
    setAdminToken("")
    setIsAdminFormOpen(false)
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(adminTokenStorageKey)
    }
    toast.addToast("已退出管理员模式", "info")
  }, [adminTokenStorageKey, toast])

  const handlePublish = useCallback(async () => {
    const normalizedTitle = titleInput.trim()
    const normalizedContent = sanitizeAnnouncementHtml(contentHtml)

    if (!canManage && !isAdmin) {
      toast.addToast("请先完成管理员认证", "warning")
      return
    }

    if (!normalizedTitle) {
      toast.addToast("请先输入公告标题", "warning")
      return
    }

    if (!hasMeaningfulContent(normalizedContent)) {
      toast.addToast("请先输入公告内容", "warning")
      return
    }

    const tokenForPublish = isAdmin ? adminToken || adminTokenInput.trim() : adminToken
    if (!tokenForPublish && !isAdmin) {
      toast.addToast("管理员凭证缺失，请重新登录", "error")
      return
    }

    setPublishing(true)
    try {
      const created = await postAnnouncement(
        {
          title: normalizedTitle,
          contentHtml: normalizedContent,
          author: "执手",
        },
        tokenForPublish,
      )

      setAnnouncements((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
      setTitleInput("")
      setContentHtml("")
      setIsAdminFormOpen(false)
      toast.addToast("公告发布成功，所有访客现在都可见", "success")
    } catch (error) {
      console.error("Failed to post announcement:", error)
      toast.addToast(error instanceof Error ? error.message : "公告发布失败，请稍后重试", "error")
    } finally {
      setPublishing(false)
    }
  }, [adminToken, adminTokenInput, canManage, contentHtml, isAdmin, titleInput, toast])

  return (
    <aside className={styles.cyberAnnRoot} aria-label="公告栏">
      <button type="button" className={`${styles.cyberAnnFab} ${isOpen ? styles.cyberAnnFabActive : ""}`} onClick={() => setIsOpen((prev) => !prev)} aria-expanded={isOpen}>
        <span>{isOpen ? "ONLINE" : "NOTICE"}</span>
        <span>{isOpen ? "关闭公告" : "查看公告"}</span>
      </button>

      <div className={`${styles.cyberAnnPanel} ${isOpen ? styles.cyberAnnPanelOpen : styles.cyberAnnPanelClosed}`}>
        <div className={styles.cyberAnnHeader}>
          <div>
            <h3 className={styles.cyberAnnTitle}>Cyber Announcements</h3>
            <div className={styles.cyberAnnSubtitle}>实时公告流</div>
          </div>
          <button type="button" className={styles.cyberAnnClose} onClick={() => setIsOpen(false)} aria-label="关闭公告面板">
            ×
          </button>
        </div>

        <div className={styles.cyberAnnBody}>
          {isLoading ? <div className={styles.cyberAnnStatus}>正在同步公告数据...</div> : null}
          {!isLoading && loadError ? (
            <div className={`${styles.cyberAnnStatus} ${styles.cyberAnnStatusError}`}>
              {loadError}
              <button type="button" className={styles.cyberAnnInlineBtn} onClick={() => void loadAnnouncements()}>
                重试
              </button>
            </div>
          ) : null}

          {!isLoading && !loadError ? (
            <div className={styles.cyberAnnList}>
              {displayAnnouncements.length === 0 ? (
                <div className={styles.cyberAnnStatus}>暂无公告</div>
              ) : (
                displayAnnouncements.map((item) => (
                  <article key={item.id} className={styles.cyberAnnItem}>
                    <div className={styles.cyberAnnItemHeader}>
                      <h4 className={styles.cyberAnnItemTitle}>{item.title}</h4>
                      <span className={styles.cyberAnnMeta}>{formatAnnouncementTime(item.createdAt)}</span>
                    </div>
                    <div className={styles.cyberAnnMeta}>By 执手</div>
                    <div className={styles.cyberAnnContent} dangerouslySetInnerHTML={{ __html: item.safeHtml }} />
                  </article>
                ))
              )}
            </div>
          ) : null}

          {canManage ? (
            <section>
              <div className={styles.cyberAnnAdminHeadRow}>
                <button type="button" className={styles.cyberAnnAdminToggle} onClick={() => setIsAdminFormOpen((prev) => !prev)}>
                  {isAdminFormOpen ? "收起管理员发布面板" : "管理员发布公告"}
                </button>
                {!isAdmin ? (
                  <button type="button" className={styles.cyberAnnGhostBtn} onClick={handleLogoutAdmin}>
                    退出
                  </button>
                ) : null}
              </div>

              <div className={`${styles.cyberAnnAdminPanel} ${isAdminFormOpen ? styles.cyberAnnAdminPanelOpen : styles.cyberAnnAdminPanelClosed}`}>
                <div className={styles.cyberAnnField}>
                  <label className={styles.cyberAnnLabel} htmlFor="cyber-ann-title">
                    标题
                  </label>
                  <input id="cyber-ann-title" className={styles.cyberAnnInput} placeholder="输入公告标题" value={titleInput} onChange={(event) => setTitleInput(event.target.value)} maxLength={120} />
                </div>

                <div className={styles.cyberAnnField}>
                  <span className={styles.cyberAnnLabel}>内容编辑器</span>
                  <CyberRichEditor value={contentHtml} onChange={setContentHtml} />
                </div>

                <button type="button" className={styles.cyberAnnSubmit} onClick={handlePublish} disabled={publishing}>
                  {publishing ? "发布中..." : "发布公告"}
                </button>
                <p className={styles.cyberAnnFootnote}>本地上传图片当前走 Base64 预览与 Mock 存储流程。后续接入 OSS/S3 时请替换为真实上传接口并保存返回 URL。</p>
              </div>
            </section>
          ) : (
            <section className={styles.cyberAnnLoginBox}>
              <div className={styles.cyberAnnLabel}>管理员登录后可发布公告</div>
              <div className={styles.cyberAnnLoginRow}>
                <input
                  type="password"
                  className={styles.cyberAnnInput}
                  placeholder="输入管理员密码"
                  value={adminTokenInput}
                  onChange={(event) => setAdminTokenInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleVerifyAdmin()
                    }
                  }}
                />
                <button type="button" className={styles.cyberAnnInlineBtn} onClick={() => void handleVerifyAdmin()} disabled={verifyingToken}>
                  {verifyingToken ? "验证中..." : "登录"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </aside>
  )
}
