"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"

interface Tab {
  id: string
  label: string
  content: React.ReactNode
  icon?: string
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content

  return (
    <div className={className}>
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? "text-white" : "text-white/60 hover:text-white/80"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg"
                style={{ background: "linear-gradient(180deg,#2a5bd7,#1a3b8f)" }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon && <i className={tab.icon}></i>}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-6"
      >
        {activeTabContent}
      </motion.div>
    </div>
  )
}
