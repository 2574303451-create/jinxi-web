"use client"

import type React from "react"
import { useEffect, useId, useRef } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isOpen) return
    const trigger = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = "hidden"
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      trigger?.focus()
    }
  }, [isOpen])
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", "2xl": "max-w-7xl", full: "max-w-[95vw]" }
  return <dialog ref={dialogRef} className={`night-dialog ${widths[size]}`} aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : "详情"}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose() } }}>
    {isOpen && <><div className="dialog-heading"><h2 id={titleId}>{title || "详情"}</h2><button onClick={onClose} aria-label="关闭弹窗">×</button></div><div className="dialog-body">{children}</div></>}
  </dialog>
}
