import { ref, nextTick } from 'vue'
import XingyunAvatarAgent from '@xmov/avatar/agent'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ensureAudio } from './audio'

// 数字人模块：星云 Agent 初始化、对话接收 + 兜底清洗、AI 文字/公式展示、开场白、语音交互。
// 依赖注入：carryMemory(ref)、buildContext(fn)、rememberAuto(fn)、pushSys(fn)
export function useAvatar({ carryMemory, buildContext, rememberAuto, pushSys }) {
  const running = ref(false)
  const listening = ref(false)
  const micText = ref('开始说话')
  const stateText = ref('初始化中…')
  const inputText = ref('')
  const aiAnswer = ref('')

  const agent = ref(null)

  /* 凭据从 .env 读取（.env 不入库，密钥脱敏） */
  const APP_ID = import.meta.env.VITE_APP_ID || ''
  const APP_SECRET = import.meta.env.VITE_APP_SECRET || ''
  const GATEWAY = import.meta.env.VITE_GATEWAY || 'https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session'

  /* ============ 兜底机制：减少崩坏、提高质量 ============
     1. 自称拦截：只在回答开头（可带问候词）自称豆包/AI助手时触发；
        拦截后清洗掉开头的自我介绍、继续念真实内容。
        若整句就是自我介绍（问“你是谁”），则念固定句。
     2. 公式清洗：把 LaTeX 全部转成口语或去掉，避免 [SDK 2404] 报错。
     3. 空响应兜底：完全没有输出时，念一句温和的请求重复。          */
  let llmBuffer = ''
  let fixing = false
  const FIXED_SELF = '我是熠墨雨，是你的学习助手和倾听者呀～'
  const FALLBACK_EMPTY = '抱歉呀，我刚才没听清，可以再说一遍吗～'
  const SELF_RE = /^(?:(?:你好|您好|嗨|哈喽)\s*[，,。!！~～]?\s*)?(?:我是|我叫|我是由)\s*(?:豆包|字节跳动|人工智能助手|AI助手|智能助手)/

  function isSelfClaimStart(text) {
    return SELF_RE.test(text.replace(/\s+/g, '').slice(0, 24))
  }

  // 去掉开头那句自我介绍，保留后续真实内容
  function stripSelfClaim(text) {
    const head = text.replace(/\s+/g, '').slice(0, 30)
    if (!SELF_RE.test(head)) return text.trim()
    const m = text.match(/(?:我是|我叫|我是由)[^。！!？?]*[。！!？?]/)
    if (m) return text.slice(text.indexOf(m[0]) + m[0].length).trim()
    return ''
  }

  // 把公式/特殊符号转成口语或去掉，避免平台 LaTeX / SSML 标签报错（[SDK 2404]）
  function speakClean(t) {
    let s = t
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\\\[[\s\S]*?\\\]/g, ' ')
      .replace(/\\\([\s\S]*?\\\)/g, ' ')
      .replace(/\$[^$\n]{1,160}\$/g, ' ')
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '（$1 分之 $2）')
      .replace(/\\[a-zA-Z]+\{[^}]*\}/g, ' ')
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/[{}\\]/g, ' ')
    return s.replace(/[ \t]{2,}/g, ' ').trim().slice(0, 600)
  }

  // AI 文字/公式展示：行间公式 $$...$$ / \[...\] → 块级 KaTeX；行内 \(...\) 与 $...$ → 行内 KaTeX；其余走 Markdown
  function renderContent(t) {
    if (!t) return ''
    let out = t
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
      try { return `<div class="math-block">${katex.renderToString(m, { displayMode: true, throwOnError: false, strict: false })}</div>` } catch (e) { return _ }
    })
    out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => {
      try { return `<div class="math-block">${katex.renderToString(m, { displayMode: true, throwOnError: false, strict: false })}</div>` } catch (e) { return _ }
    })
    out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => {
      try { return `<span class="math-inline">${katex.renderToString(m, { throwOnError: false, strict: false })}</span>` } catch (e) { return _ }
    })
    out = out.replace(/\$([^$\n]{1,80})\$/g, (_, m) => {
      try { return `<span class="math-inline">${katex.renderToString(m, { throwOnError: false, strict: false })}</span>` } catch (e) { return _ }
    })
    return marked.parse(out)
  }

  function handleLLM(resp) {
    if (resp.isFirst) { llmBuffer = ''; fixing = false; aiAnswer.value = '' }
    if (resp.text) {
      llmBuffer += resp.text
      // 展示区：去自称、保留公式原文（不清洗公式，供阅读）
      const shown = stripSelfClaim(llmBuffer)
      aiAnswer.value = shown || (isSelfClaimStart(llmBuffer) ? FIXED_SELF : llmBuffer)
      if (!fixing && isSelfClaimStart(llmBuffer)) {
        fixing = true
        try { agent.value?.interrupt() } catch (e) {}
        setTimeout(() => {
          const rest = stripSelfClaim(llmBuffer)
          const final = rest ? speakClean(rest) : FIXED_SELF
          try { agent.value?.speak(final) } catch (e) {}
        }, 500)
      }
    }
    if (resp.event === 'done' && !fixing && !llmBuffer.trim()) {
      setTimeout(() => { try { agent.value?.speak(FALLBACK_EMPTY) } catch (e) {} }, 600)
    }
  }

  /* ============ 开场白 ============ */
  const GREETING = '嘻嘻，你好呀朋友，我叫熠墨雨，是你的学习伙伴和倾听者，很高兴认识你！'
  let greetTimer = null

  function speakGreeting() {
    if (!agent.value) return
    if (agent.value.getAgentState() !== 'running') return
    clearTimeout(greetTimer)
    greetTimer = setTimeout(() => {
      if (agent.value.getAgentState() === 'running') { try { agent.value.speak(GREETING) } catch (e) {} }
    }, 4000)
  }

  /* ============ 初始化数字人 ============ */
  async function initAvatar() {
    await nextTick()
    const container = document.getElementById('avatar-container')
    if (!container) { pushSys('容器不存在：检查 <div id="avatar-container"> 是否在模板'); return }
    const inst = new XingyunAvatarAgent({
      container,
      appId: APP_ID,
      appSecret: APP_SECRET,
      gatewayServer: GATEWAY,
      onMessage(error) { pushSys(`[SDK ${error.code}] ${error.message}`) },
      agentCallbacks: {
        onAgentStateChange(s) {
          const wasRunning = running.value
          running.value = s === 'running'
          stateText.value = `Agent: ${s}`
          if (s === 'running') speakGreeting()
          if (!wasRunning && s === 'running' && listening.value) { inst?.startASR() }
        },
        onASRStateChange(s) { listening.value = s === 'listening'; micText.value = listening.value ? '停止说话' : '开始说话' },
        onASRResult(r) { if (r.isFinal) rememberAuto(r.text) },
        onLLMResponse: handleLLM,
        onError(error) { pushSys(`[${error.domain}] ${error.code}: ${error.message}`) },
      },
    })
    await inst.init()
    window.__agent = inst
    agent.value = inst
    if (inst.getAgentState() === 'running') speakGreeting()
    else pushSys('初始化未进入 running，请看上方报错')
  }

  /* ============ 语音交互 ============ */
  async function toggleMic() { ensureAudio(); if (listening.value) await agent.value?.stopASR(); else await agent.value?.startASR() }

  async function sendAsk() {
    ensureAudio()
    if (!running.value || !inputText.value) return
    const text = inputText.value
    inputText.value = ''
    rememberAuto(text)
    const payload = carryMemory.value ? buildContext() + text : text
    try { await agent.value?.ask(payload) } catch (e) {}
  }

  function onInterrupt() { ensureAudio(); try { agent.value?.interrupt() } catch (e) {} }
  function reloadPage() { window.location.reload() }
  function stopGreet() { clearTimeout(greetTimer) }
  function destroy() { try { agent.value?.destroy() } catch (e) {} }

  return {
    running, listening, micText, stateText, inputText, aiAnswer, agent, renderContent,
    handleLLM, initAvatar, toggleMic, sendAsk, onInterrupt, reloadPage, destroy, stopGreet,
  }
}
