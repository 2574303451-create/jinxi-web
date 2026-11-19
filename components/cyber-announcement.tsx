"use client"

import { ChangeEvent, ClipboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type Announcement, fetchAnnouncements } from "../services/announcement-service"
import { loadAnnouncementSanitizer, safeAnnouncementUrl, MAX_ANNOUNCEMENT_HTML, type AnnouncementSanitizer } from "../lib/announcement-html"
import { useToast } from "./ui/toast"
import { Modal } from "./ui/modal"
import { PaperState } from "./ui/paper"
import styles from "./cyber-announcement.module.css"

// JSON.stringify can expand one code unit to six characters (\u0000).
const MAX_STORED_ANNOUNCEMENT_DRAFT = 6 * MAX_ANNOUNCEMENT_HTML + 1024

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
      <div className={styles.cyberAnnToolbar} role="group" aria-label="草稿排版">
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("bold")} title="加粗" aria-label="加粗">
          B
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("italic")} title="斜体" aria-label="斜体">
          I
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("underline")} title="下划线" aria-label="下划线">
          U
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("formatBlock", "h2")} title="二级标题" aria-label="二级标题">
          H2
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("insertUnorderedList")} title="无序列表" aria-label="无序列表">
          •
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("insertOrderedList")} title="有序列表" aria-label="有序列表">
          1.
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => executeCommand("formatBlock", "blockquote")} title="引用块" aria-label="引用块">
          "
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowEmojiPanel((prev) => !prev)} title="插入 Emoji" aria-label="插入表情">
          🙂
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowImageUrlInput((prev) => !prev)} title="插入图片 URL" aria-label="插入图片网址">
          URL
        </button>
        <button type="button" className={styles.cyberAnnToolBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} title="本地上传图片（Base64）" aria-label="从本机选择草稿图片">
          IMG
        </button>
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
          <input type="url" className="paper-input" aria-label="图片 URL" value={imageUrlDraft} onChange={(event) => setImageUrlDraft(event.target.value)} placeholder="粘贴图片 URL（https://...）" />
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
      if (raw.length > MAX_STORED_ANNOUNCEMENT_DRAFT) throw Error('Draft too large')
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
      if (contentHtml.length > MAX_ANNOUNCEMENT_HTML) throw Error('Draft too large')
      const html = sanitize(contentHtml)
      const encoded = JSON.stringify({title:titleInput.slice(0,120),html})
      if (html.length > MAX_ANNOUNCEMENT_HTML || encoded.length > MAX_STORED_ANNOUNCEMENT_DRAFT) throw Error('Draft too large')
      localStorage.setItem('jinxi-announcement-draft-v1',encoded)
      setDraftMessage("草稿已保存在此浏览器，尚未发布。")
    } catch { setDraftMessage("草稿保存失败，请保留编辑内容后重试。") }
  }
  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="公会动态" size="lg" legacy={false}>
      <div className={styles.stack}>
        {isLoading && <PaperState kind="loading" title="正在加载公告…" />}
        {loadError && <PaperState kind="error" title={loadError} action={
          <button type="button" className="paper-button" onClick={() => void loadAnnouncements()}>重试</button>
        } />}
        {sanitizerError && <PaperState kind="error" title={sanitizerError} />}
        {!isLoading && !loadError && !sanitize && !sanitizerError && <PaperState kind="loading" title="正在准备安全公告显示…" />}
        {!isLoading && !loadError && sanitize && (
          displayAnnouncements.length === 0
            ? <PaperState kind="empty" title="暂无公告" />
            : displayAnnouncements.map(item => (
              <article key={item.id} className={styles.announcement}>
                <header className={styles.announcementHeader}>
                  <h3>{item.title}</h3>
                  <p>{item.author} · {formatAnnouncementTime(item.createdAt)}</p>
                </header>
                <div className={styles.richText} data-announcement-content dangerouslySetInnerHTML={{ __html: item.safeHtml }} />
              </article>
            ))
        )}
        <section className={styles.draft} aria-labelledby="cyber-ann-draft-heading">
          <h3 id="cyber-ann-draft-heading">本机草稿</h3>
          <p>草稿及图片只保存在此浏览器。</p>
          <button type="button" className="paper-button" onClick={() => setDraftOpen(prev => !prev)} disabled={!sanitize} aria-expanded={draftOpen} aria-controls="cyber-ann-draft">
            {draftOpen ? "收起本机草稿" : "编辑本机草稿"}
          </button>
          <div id="cyber-ann-draft" hidden={!draftOpen || !sanitize}>
            {draftOpen && sanitize && <div className={styles.stack}>
              <label className="paper-label" htmlFor="cyber-ann-title">草稿标题</label>
              <input id="cyber-ann-title" className="paper-input" value={titleInput} onChange={e => setTitleInput(e.target.value)} maxLength={120} />
              <CyberRichEditor value={contentHtml} onChange={setContentHtml} sanitize={sanitize} />
              <div className={styles.actions}>
                <button type="button" className="paper-button yellow" onClick={saveDraft}>保存本机草稿</button>
                <button type="button" className="paper-button" disabled>发布暂未开放</button>
              </div>
              {draftMessage && <p role={draftMessage.includes('失败') || draftMessage.includes('无法') ? 'alert' : 'status'}>{draftMessage}</p>}
            </div>}
          </div>
        </section>
      </div>
    </Modal>
  )
}
