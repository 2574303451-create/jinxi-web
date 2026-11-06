"use client"

import { ChangeEvent, ClipboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type Announcement, fetchAnnouncements } from "../services/announcement-service"
import { loadAnnouncementSanitizer, safeAnnouncementUrl, MAX_ANNOUNCEMENT_HTML, type AnnouncementSanitizer } from "../lib/announcement-html"
import { useToast } from "./ui/toast"
import { Modal } from "./ui/modal"
import styles from "./cyber-announcement.module.css"

interface CyberAnnouncementProps {
  isAdmin?: boolean
  adminTokenStorageKey?: string
}

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  sanitize: AnnouncementSanitizer
}

const CYBER_EMOJIS = ["😀", "😎", "🤖", "🚀", "✨", "🔥", "🎯", "📢", "📌", "✅", "⚡", "🎉", "🧠", "🛰️", "🛠️", "💡"]

function isSafeImageSource(source: string) {
  return safeAnnouncementUrl(source, true)
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

export function CyberRichEditor({ value, onChange, sanitize }: RichEditorProps) {
  const toast = useToast()
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const lastSafeHtml = useRef("")

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

    const safeValue = sanitize(value)
    lastSafeHtml.current = safeValue
    if (editorRef.current.innerHTML !== safeValue) {
      editorRef.current.innerHTML = safeValue
    }

    syncEmptyState(safeValue)
  }, [value, sanitize, syncEmptyState])

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
    if (currentHtml.length > MAX_ANNOUNCEMENT_HTML) {
      if (editorRef.current) editorRef.current.innerHTML = lastSafeHtml.current
      toast.addToast("内容过大，原草稿已保留。", "warning")
      return
    }
    const safeHtml = sanitize(currentHtml)
    lastSafeHtml.current = safeHtml
    if (editorRef.current && safeHtml !== currentHtml) editorRef.current.innerHTML = safeHtml
    onChange(safeHtml)
    syncEmptyState(safeHtml)
  }, [onChange, sanitize, syncEmptyState, toast])

  const executeCommand = useCallback(
    (command: string, commandValue?: string) => {
      editorRef.current?.focus()
      restoreSelection()
      document.execCommand("styleWithCSS", false, "false")
      document.execCommand(command, false, commandValue)
      emitChange()
      saveSelection()
    },
    [emitChange, restoreSelection, saveSelection],
  )

  const insertHtml = useCallback(
    (html: string) => {
      if (html.length > MAX_ANNOUNCEMENT_HTML) { toast.addToast("内容过大，原草稿已保留。", "warning"); return }
      const safe = sanitize(html)
      if ((editorRef.current?.innerHTML.length || 0) + safe.length > MAX_ANNOUNCEMENT_HTML) { toast.addToast("内容过大，原草稿已保留。", "warning"); return }
      editorRef.current?.focus()
      restoreSelection()
      document.execCommand("insertHTML", false, safe)
      emitChange()
      saveSelection()
    },
    [emitChange, restoreSelection, saveSelection, sanitize, toast],
  )

  const insertImage = useCallback(
    (src: string, alt: string) => {
      if (!isSafeImageSource(src)) {
        toast.addToast("图片仅支持 HTTPS、站内路径或受限的 PNG/JPEG/WebP/GIF 数据。", "warning")
        return
      }

      const safeSrc = escapeHtmlAttribute(src)
      const safeAlt = escapeHtmlAttribute(alt || "announcement-image")
      insertHtml(
        `<p><img src="${safeSrc}" alt="${safeAlt}" /></p><p><br></p>`,
      )
    },
    [insertHtml, toast],
  )

  const handleInput = useCallback(() => {
    emitChange()
    saveSelection()
  }, [emitChange, saveSelection])

  const readImageFile = useCallback((file: File) => {
    if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type) || file.size > 512 * 1024) {
      toast.addToast("请选择不超过512KiB的 PNG/JPEG/WebP/GIF 图片。", "warning")
      return
    }
    const reader = new FileReader()
    reader.onerror = () => toast.addToast("图片读取失败，原草稿保留。", "error")
    reader.onload = () => { if (typeof reader.result === 'string') insertImage(reader.result, file.name || 'clipboard-image') }
    reader.readAsDataURL(file)
  }, [insertImage, toast])

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      // Prevent native HTML insertion: cleaning after insertion is too late.
      event.preventDefault()
      const image = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile()
      if (image) { readImageFile(image); return }
      const html = event.clipboardData.getData('text/html')
      if (html) { insertHtml(html); return }
      const text = event.clipboardData.getData('text/plain')
      const node = document.createElement('div')
      node.textContent = text
      insertHtml(node.innerHTML.replace(/\r\n|\r|\n/g, '<br>'))
    },
    [insertHtml, readImageFile],
  )

  const handleLocalFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file) {
        return
      }

      readImageFile(file)
    },
    [readImageFile],
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

      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={handleLocalFileChange} />

      <div
        ref={editorRef}
        className={styles.cyberAnnEditorSurface}
        contentEditable
        role="textbox"
        aria-label="公告草稿内容"
        aria-multiline="true"
        suppressContentEditableWarning
        spellCheck={false}
        data-empty={isEmpty}
        data-placeholder="输入公告内容，支持基础排版、Emoji、图片 URL、本地图片（Base64）..."
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={(event) => { event.preventDefault(); toast.addToast("请使用IMG或URL插入图片。", "info") }}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onBlur={saveSelection}
      />
    </div>
  )
}

export function CyberAnnouncement(_props: CyberAnnouncementProps = {}) {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [sanitize, setSanitize] = useState<AnnouncementSanitizer | null>(null)
  const [sanitizerError, setSanitizerError] = useState("")
  const [draftOpen, setDraftOpen] = useState(false)
  const [titleInput, setTitleInput] = useState("")
  const [contentHtml, setContentHtml] = useState("")
  const [draftMessage, setDraftMessage] = useState("")
  const loadedDraft = useRef(false)

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true)
    setLoadError("")
    try { setAnnouncements(await fetchAnnouncements()) }
    catch { setLoadError("公告加载失败，请稍后重试。") }
    finally { setIsLoading(false) }
  }, [])
  useEffect(() => { void loadAnnouncements() }, [loadAnnouncements])
  useEffect(() => {
    const open = () => setIsOpen(true)
    window.addEventListener("cyber-announcement:open", open)
    return () => window.removeEventListener("cyber-announcement:open", open)
  }, [])
  useEffect(() => {
    if (!isOpen || sanitize) return
    let active = true
    setSanitizerError("")
    loadAnnouncementSanitizer().then(fn => { if (active) setSanitize(() => fn) })
      .catch(() => { if (active) setSanitizerError("安全显示组件暂不可用，请关闭公告后重试。") })
    return () => { active = false }
  }, [isOpen, sanitize])
  useEffect(() => {
    if (!isOpen || !sanitize || loadedDraft.current) return
    loadedDraft.current = true
    try {
      const raw = localStorage.getItem('jinxi-announcement-draft-v1')
      if (!raw) return
      if (raw.length > 1_001_000) throw Error('Draft too large')
      const draft = JSON.parse(raw)
      if (typeof draft.title !== 'string' || typeof draft.html !== 'string') throw Error('Invalid draft')
      if (draft.html.length > MAX_ANNOUNCEMENT_HTML) throw Error('Draft too large')
      setTitleInput(draft.title.slice(0,120))
      setContentHtml(sanitize(draft.html))
    } catch { setDraftMessage("草稿暂无法恢复；原存储未改写。") }
  }, [isOpen, sanitize])
  const displayAnnouncements = useMemo(() => sanitize ? announcements.map(item => ({...item,safeHtml:sanitize(item.contentHtml)})) : [], [announcements,sanitize])
  const saveDraft = () => {
    if (!sanitize) return
    try {
      const html = sanitize(contentHtml)
      localStorage.setItem('jinxi-announcement-draft-v1',JSON.stringify({title:titleInput,html}))
      setDraftMessage("草稿已保存在此浏览器，尚未发布。")
    } catch { setDraftMessage("草稿保存失败，请保留编辑内容后重试。") }
  }
  return (
    <aside className={styles.cyberAnnRoot} aria-label="公告栏">
      <button type="button" className={`${styles.cyberAnnFab} ${isOpen ? styles.cyberAnnFabActive : ""}`} onClick={() => setIsOpen(prev => !prev)} aria-expanded={isOpen}>
        <span>{isOpen ? "ONLINE" : "NOTICE"}</span><span>{isOpen ? "关闭公告" : "查看公告"}</span>
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="公会动态" size="lg">
        <div className={styles.cyberAnnPanel}>
          <div className={styles.cyberAnnHeader}>
            <div><h3 className={styles.cyberAnnTitle}>公会公告</h3><div className={styles.cyberAnnSubtitle}>以公会实际发布内容为准</div></div>
            <button type="button" className={styles.cyberAnnClose} onClick={() => setIsOpen(false)} aria-label="关闭公告面板">×</button>
          </div>
          <div className={styles.cyberAnnBody}>
            {isLoading ? <div className={styles.cyberAnnStatus} role="status">正在同步公告数据...</div> : null}
            {loadError ? <div className={`${styles.cyberAnnStatus} ${styles.cyberAnnStatusError}`} role="alert">{loadError}<button type="button" className={styles.cyberAnnInlineBtn} onClick={() => void loadAnnouncements()}>重试</button></div> : null}
            {sanitizerError ? <div className={styles.cyberAnnStatusError} role="alert">{sanitizerError}</div> : null}
            {!sanitize && !sanitizerError ? <p role="status">正在准备安全公告显示...</p> : null}
            {!isLoading && !loadError && sanitize ? <div className={styles.cyberAnnList}>
              {displayAnnouncements.length === 0 ? <div className={styles.cyberAnnStatus}>暂无公告</div> : displayAnnouncements.map(item => (
                <article key={item.id} className={styles.cyberAnnItem}>
                  <div className={styles.cyberAnnItemHeader}><h4 className={styles.cyberAnnItemTitle}>{item.title}</h4><span className={styles.cyberAnnMeta}>{formatAnnouncementTime(item.createdAt)}</span></div>
                  <div className={styles.cyberAnnMeta}>By 执手</div>
                  <div className={styles.cyberAnnContent} data-announcement-content dangerouslySetInnerHTML={{__html:item.safeHtml}} />
                </article>
              ))}
            </div> : null}
            <section>
              <p className={styles.cyberAnnStatus}>公告认证与发布正在安全升级。可以先编辑并保留本机草稿，暂不接受旧管理口令。</p>
              <button type="button" className={styles.cyberAnnAdminToggle} onClick={() => setDraftOpen(prev => !prev)} disabled={!sanitize}>{draftOpen ? "收起本机草稿" : "编辑本机草稿"}</button>
              {draftOpen && sanitize ? <div className={`${styles.cyberAnnAdminPanel} ${styles.cyberAnnAdminPanelOpen}`}>
                <div className={styles.cyberAnnField}><label className={styles.cyberAnnLabel} htmlFor="cyber-ann-title">草稿标题</label><input id="cyber-ann-title" className={styles.cyberAnnInput} value={titleInput} onChange={e => setTitleInput(e.target.value)} maxLength={120} /></div>
                <div className={styles.cyberAnnField}><span className={styles.cyberAnnLabel}>草稿内容</span><CyberRichEditor value={contentHtml} onChange={setContentHtml} sanitize={sanitize} /></div>
                <button type="button" className={styles.cyberAnnSubmit} onClick={saveDraft}>保存本机草稿</button>
                <button type="button" className={styles.cyberAnnSubmit} disabled title="服务器成员及管理员权限验收后恢复">发布暂未开放</button>
                <p className={styles.cyberAnnFootnote}>图片仅随草稿保存在此浏览器，未上传。草稿保存不代表公会发布。</p>
                {draftMessage ? <p role={draftMessage.includes('失败') || draftMessage.includes('无法') ? 'alert' : 'status'}>{draftMessage}</p> : null}
              </div> : null}
            </section>
          </div>
        </div>
      </Modal>
    </aside>
  )
}
