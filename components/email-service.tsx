"use client"

// 邮箱发送服务组件
// 基于original.txt中的成功实现，支持EmailJS + FormSubmit双重备选

export interface RecruitmentData {
  nickname: string
  contact: string
  time: string
  role: string
  message: string
}

export interface EmailServiceConfig {
  toEmail: string
  emailJsPublicKey: string
  emailJsServiceId: string
  emailJsTemplateId: string
}

// 默认配置（基于original.txt中的配置）
const DEFAULT_CONFIG: EmailServiceConfig = {
  toEmail: "leijia_13335319637@163.com",
  emailJsPublicKey: "u9DpmrVbWAUL3awLJ",
  emailJsServiceId: "service_galwwlw", 
  emailJsTemplateId: "template_dccwzlb"
}

// 动态加载EmailJS
function loadEmailJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.emailjs) {
      resolve(window.emailjs)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js'
    script.onload = () => {
      if (window.emailjs) {
        resolve(window.emailjs)
      } else {
        reject(new Error('EmailJS failed to load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load EmailJS script'))
    document.head.appendChild(script)
  })
}

// 通过EmailJS发送邮件
async function sendByEmailJS(data: RecruitmentData, config: EmailServiceConfig = DEFAULT_CONFIG): Promise<void> {
  const emailjs = await loadEmailJS()
  
  // 初始化EmailJS
  emailjs.init({ publicKey: config.emailJsPublicKey })
  
  // 构建邮件变量
  const templateVars = {
    to_email: config.toEmail,
    nickname: data.nickname,
    contact: data.contact,
    time: data.time,
    role: data.role,
    message: data.message,
    ua: navigator.userAgent,
    reply_to: /@/.test(data.contact) ? data.contact : undefined
  }
  
  // 发送邮件
  const result = await emailjs.send(config.emailJsServiceId, config.emailJsTemplateId, templateVars)
  
  if (!result || result.status !== 200) {
    throw new Error('EmailJS发送失败')
  }
}

// 通过FormSubmit发送邮件
async function sendByFormSubmit(data: RecruitmentData, config: EmailServiceConfig = DEFAULT_CONFIG): Promise<void> {
  const formSubmitUrl = `https://formsubmit.co/ajax/${encodeURIComponent(config.toEmail)}`
  
  const formData = new FormData()
  formData.append('昵称', data.nickname)
  formData.append('联系方式', data.contact)
  formData.append('常在线时段', data.time)
  formData.append('偏好定位', data.role)
  formData.append('留言', data.message)
  formData.append('UA', navigator.userAgent)
  formData.append('_subject', `【招新申请】${data.nickname || ""}`)
  formData.append('_template', 'table')
  
  const response = await fetch(formSubmitUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    },
    body: formData
  })
  
  if (!response.ok) {
    throw new Error('FormSubmit发送失败')
  }
}

// 本地邮箱客户端备选方案
function fallbackMailto(data: RecruitmentData, config: EmailServiceConfig = DEFAULT_CONFIG): void {
  const subject = encodeURIComponent(`【招新申请】${data.nickname || ""}`)
  const body = encodeURIComponent(
    `游戏昵称：${data.nickname}\n` +
    `联系方式：${data.contact}\n` +
    `在线时段：${data.time}\n` +
    `偏好定位：${data.role}\n` +
    `留言：${data.message}\n` +
    `UA：${navigator.userAgent}`
  )
  
  window.location.href = `mailto:${config.toEmail}?subject=${subject}&body=${body}`
}

// 主要的邮件发送函数
export async function sendRecruitmentEmail(
  data: RecruitmentData,
  config: EmailServiceConfig = DEFAULT_CONFIG,
  onProgress?: (message: string, type?: 'info' | 'success' | 'error') => void
): Promise<{ success: boolean; method: string; error?: string }> {
  
  // 验证必填字段
  if (!data.nickname?.trim() || !data.contact?.trim()) {
    throw new Error('请填写"游戏昵称"和"联系方式"')
  }
  
  onProgress?.('正在发送...', 'info')
  
  // 尝试EmailJS
  try {
    await sendByEmailJS(data, config)
    onProgress?.('✅ 已发送！', 'success')
    return { success: true, method: 'EmailJS' }
  } catch (error) {
    console.warn('EmailJS发送失败:', error)
  }
  
  // 尝试FormSubmit备选方案
  try {
    await sendByFormSubmit(data, config)
    onProgress?.('✅ 已通过备选通道发送！', 'success')
    return { success: true, method: 'FormSubmit' }
  } catch (error) {
    console.warn('FormSubmit发送失败:', error)
  }
  
  // 所有方案都失败，使用本地邮箱客户端
  onProgress?.('切换到本地邮箱...', 'error')
  fallbackMailto(data, config)
  
  return { 
    success: false, 
    method: 'mailto', 
    error: '自动发送失败，已切换到本地邮箱客户端' 
  }
}

// 声明window.emailjs类型
declare global {
  interface Window {
    emailjs: any
  }
}
