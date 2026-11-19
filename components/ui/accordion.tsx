"use client"

import { ChevronDown } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import styles from "./accordion.module.css"

interface AccordionItem {
  id: string
  title: string
  content: ReactNode
  icon?: ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  allowMultiple?: boolean
  className?: string
}

export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const groupId = useId()
  const [openItems, setOpenItems] = useState<string[]>([])

  function toggleItem(id: string) {
    setOpenItems((previous) => {
      if (previous.includes(id)) return previous.filter((item) => item !== id)
      return allowMultiple ? [...previous, id] : [id]
    })
  }

  return (
    <div className={className ? `${styles.accordion} ${className}` : styles.accordion}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id)
        const triggerId = `${groupId}-question-${item.id}`
        const answerId = `${groupId}-answer-${item.id}`
        return (
          <div key={item.id} className={styles.item}>
            <h3 className={styles.heading}>
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                className={styles.trigger}
                onClick={() => toggleItem(item.id)}
              >
                <span className={styles.question}>
                  {item.icon && <span className={styles.icon} aria-hidden="true">{item.icon}</span>}
                  <span>{item.title}</span>
                </span>
                <ChevronDown className={styles.indicator} size={20} aria-hidden="true" />
              </button>
            </h3>
            <div id={answerId} hidden={!isOpen} role="region" aria-labelledby={triggerId} className={styles.answer}>
              {item.content}
            </div>
          </div>
        )
      })}
    </div>
  )
}
