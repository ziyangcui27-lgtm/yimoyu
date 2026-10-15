<template>
  <div class="page" :class="{ dark }">
    <!-- ============ 主界面（数字人常驻，永不卸载） ============ -->
    <header class="topbar">
      <div class="brand">
        <span class="brand-dot"></span>
        <div class="brand-text">
          <h1>熠墨雨</h1>
          <p>温柔倾听，教育陪伴</p>
        </div>
      </div>
      <div class="top-right">
        <button v-if="alarm.running || alarm.remain < alarm.total" class="alarm-chip" :class="{ ring: alarm.ringing }" @click="openAlarmFromHome" :title="alarm.ringing ? '时间到啦，点击重置' : '闹钟进行中，点击查看'">⏰ {{ fmtRemain(alarm.remain) }}</button>
        <button class="theme-toggle" @click="dark = !dark">{{ dark ? '切回浅色' : '切换深色' }}</button>
        <div class="status-pill" :class="{ on: running }"><span class="dot"></span>{{ running ? '在线陪伴' : '连接中…' }}</div>
      </div>
    </header>

    <div class="body" :class="{ 'chat-open': taskPanelOpen }">
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sb-content" v-show="sidebarOpen">
          <div class="card">
            <div class="card-title">现在时间</div>
            <div class="clock">{{ nowStr }}</div>
          </div>
          <div class="card">
            <div class="card-title">天气播报 · 武汉</div>
            <div v-if="weather" class="weather">
              <div class="w-top"><span class="w-icon">{{ weatherIcon }}</span><div class="w-temp">{{ weather.temp }}°</div></div>
              <div class="w-desc">{{ weatherText }}</div>
              <div class="w-range">最高 {{ weather.max }}° / 最低 {{ weather.min }}°</div>
              <div v-if="aqi !== null" class="w-aqi" :style="{ color: aqiComputed.color }">AQI {{ aqi }} · {{ aqiComputed.label }}</div>
              <div v-else class="w-aqi">AQI 获取中…</div>
              <div class="w-sub">风速 {{ weather.wind }} km/h</div>
            </div>
            <div v-else class="w-loading">{{ weatherErr || '正在获取天气…' }}</div>
          </div>
          <div class="card">
            <div class="card-title">实时网速</div>
            <div class="speed-value">{{ speedResult }}</div>
            <div class="speed-sub" :class="{ live: sampling }"><span class="speed-dot"></span>{{ sampling ? '监测中…' : '每秒实时监测' }}</div>
          </div>
          <div class="card more-entry" @click="view = 'components'"><span class="more-label">更多组件</span><span class="more-arrow">›</span></div>
        </div>
      </aside>

      <div class="main-col">
        <main class="stage">
          <div class="frame"><div id="avatar-container"></div></div>
        </main>
        <section class="chat">
          <p v-for="(t, i) in sysMsgs" :key="'s' + i" class="msg sys">{{ t }}</p>
        </section>
        <footer class="dock">
          <div class="input-wrap">
            <input v-model="inputText" placeholder="想对熠墨雨说点什么…" @keyup.enter="sendAsk" />
            <button class="btn mic" @click="toggleMic" :disabled="!running" :title="micText">{{ micText }}</button>
            <button class="btn send" @click="sendAsk" :disabled="!running || !inputText">发送</button>
            <button class="btn stop" @click="onInterrupt" :disabled="!running" title="打断">打断</button>
            <button class="btn reload" @click="reloadPage" title="刷新页面重连">⟳</button>
          </div>
        </footer>
      </div>
    </div>

    <!-- ============ 左 / 右侧折叠手柄 ============ -->
    <button class="side-toggle left-toggle" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? '收起信息栏' : '展开信息栏'">
      <span class="side-arrow" :class="{ open: sidebarOpen }">›</span>
    </button>
    <button class="side-toggle right-toggle" @click="taskPanelOpen = !taskPanelOpen" :title="taskPanelOpen ? '收起任务面板' : '展开任务面板'">
      <span class="side-arrow" :class="{ open: taskPanelOpen }">‹</span>
    </button>

    <!-- ============ 右侧：任务面板 ============ -->
    <aside class="chat-panel" :class="{ open: taskPanelOpen }">
      <header class="cp-head">
        <div class="cp-title">📋 任务 <span class="cp-stat">{{ taskStat }}</span></div>
      </header>
      <div class="cp-body">
        <div class="cp-add">
          <input v-model="newTaskTitle" placeholder="添加任务描述，回车确认…" @keyup.enter="addTask" :maxlength="60" />
          <button class="btn send cp-add-btn" @click="addTask" :disabled="!newTaskTitle.trim()">＋</button>
        </div>
        <div v-for="t in tasks" :key="t.id" class="cp-task" @click="openTaskEditor(t)">
          <div class="cp-task-main">
            <div class="cp-task-title">{{ t.title || '（无标题）' }}</div>
            <div class="cp-task-meta">
              <span class="cp-task-dates">{{ dateRange(t) }}</span>
              <span class="cp-task-ratio">{{ t.steps.filter(s => s.done).length }}/{{ t.steps.length }}</span>
            </div>
          </div>
          <span class="cp-task-arrow">›</span>
        </div>
        <p v-if="!tasks.length" class="cp-empty">还没有任务，先给自己定个小目标吧～</p>
      </div>
    </aside>

    <!-- ============ 组件库：浮层叠加，不卸载主界面/数字人 ============ -->
    <div v-if="view === 'components'" class="comp-overlay">
      <header class="comp-topbar">
        <button class="back-btn" @click="view = 'home'">‹ 返回</button>
        <div class="comp-title">
          <h1>组件库</h1>
          <p>在这里发现更多互动小工具</p>
        </div>
      </header>
      <main class="comp-main">
        <div class="comp-grid">
          <div class="comp-tile" @click="openAlarm">
            <span class="tile-icon">⏰</span>
            <span class="tile-name">定时闹钟</span>
            <span class="tile-sub">计时与提醒</span>
          </div>
          <div class="comp-tile" @click="openMemory">
            <span class="tile-icon">🧠</span>
            <span class="tile-name">记忆</span>
            <span class="tile-sub">{{ entries.length }} 条记忆</span>
          </div>
          <div class="comp-tile" @click="openTaskPanel">
            <span class="tile-icon">📋</span>
            <span class="tile-name">任务</span>
            <span class="tile-sub">{{ tasks.length }} 项进行中</span>
          </div>
          <div class="comp-tile" @click="openCalc">
            <span class="tile-icon">🧮</span>
            <span class="tile-name">计算器</span>
            <span class="tile-sub">支持键盘 · 随叫随算</span>
          </div>
        </div>
        <p class="comp-hint">共四个小工具，轻点即用～</p>
      </main>

      <!-- 闹钟面板（浮层内） -->
      <div v-if="alarm.open" class="alarm-mask" @click.self="closeAlarm">
        <div class="alarm-panel" :class="{ ring: alarm.ringing }">
          <div class="alarm-head">
            <span class="alarm-title">⏰ 计时器</span>
            <button class="alarm-close" @click="closeAlarm" title="后台运行">×</button>
          </div>
          <div v-if="!alarm.running && alarm.remain === alarm.total && !alarm.ringing" class="picker">
            <div class="picker-col">
              <button class="pk-btn" @click="adjust('h', 1)">▲</button>
              <div class="pk-val">{{ pad(alarm.hours) }}</div>
              <button class="pk-btn" @click="adjust('h', -1)">▼</button>
              <div class="pk-label">小时</div>
            </div>
            <div class="picker-col">
              <button class="pk-btn" @click="adjust('m', 1)">▲</button>
              <div class="pk-val">{{ pad(alarm.minutes) }}</div>
              <button class="pk-btn" @click="adjust('m', -1)">▼</button>
              <div class="pk-label">分钟</div>
            </div>
            <div class="picker-col">
              <button class="pk-btn" @click="adjust('s', 1)">▲</button>
              <div class="pk-val">{{ pad(alarm.seconds) }}</div>
              <button class="pk-btn" @click="adjust('s', -1)">▼</button>
              <div class="pk-label">秒</div>
            </div>
          </div>
          <template v-else>
            <div class="ring-wrap">
              <svg viewBox="0 0 120 120" class="ring-svg">
                <circle class="ring-bg" cx="60" cy="60" r="52"></circle>
                <circle class="ring-fg" cx="60" cy="60" r="52" :style="ringStyle"></circle>
              </svg>
              <div class="ring-time">{{ fmtRemain(alarm.remain) }}</div>
            </div>
            <div v-if="alarm.ringing" class="ring-msg">⏰ 时间到啦，该休息一下啦～</div>
            <div v-else-if="alarm.running" class="ring-msg subtle">计时中，可关闭面板后台运行</div>
          </template>
          <div class="alarm-actions">
            <button v-if="alarm.remain === alarm.total && !alarm.running && !alarm.ringing" class="alarm-btn start" @click="startAlarm">开始</button>
            <template v-else>
              <button class="alarm-btn start" @click="togglePause">{{ alarm.running ? '暂停' : (alarm.ringing ? '重置' : '继续') }}</button>
              <button class="alarm-btn reset" @click="resetAlarm">重置</button>
            </template>
          </div>
        </div>
      </div>

      <!-- 记忆面板（浮层内） -->
      <div v-if="memory.open" class="alarm-mask" @click.self="closeMemory">
        <div class="memory-panel">
          <div class="alarm-head">
            <span class="alarm-title">🧠 记忆 · {{ entries.length }} 条</span>
            <button class="alarm-close" @click="closeMemory" title="关闭">×</button>
          </div>
          <div class="mem-sec-title">添加记忆点</div>
          <div class="mem-add">
            <input v-model="newTitle" placeholder="输入一句话标题，点开后进入编辑界面…" @keyup.enter="addEntry" :maxlength="60" />
            <button class="alarm-btn start mem-add-btn" @click="addEntry" :disabled="!newTitle.trim()">添加</button>
          </div>
          <div class="mem-sec-title">记忆点列表（★ 优先 · 点开进入全屏编辑 · 单条上限 3000 字）</div>
          <div class="mem-list">
            <div v-for="en in sortedEntries" :key="en.id" class="mem-item" @click="openEditor(en)">
              <div class="mem-row">
                <span class="mem-star" :class="{ on: en.starred }">{{ en.starred ? '★' : '☆' }}</span>
                <span class="mem-kind" :class="en.kind">{{ en.kind === 'pref' ? '偏好' : '消息' }}</span>
                <span class="mem-title">{{ en.title || '（无标题）' }}</span>
                <span class="mem-count">{{ en.body.length }}/3000</span>
                <span class="mem-arrow">›</span>
              </div>
            </div>
            <p v-if="!entries.length" class="mem-empty">还没有记忆点。可以手动添加，或先跟熠墨雨说几句话自动记录～</p>
          </div>
          <div class="mem-foot">
            <label class="switch"><input type="checkbox" v-model="carryMemory" /> 发送时携带记忆给熠墨雨</label>
            <button class="alarm-btn reset" @click="clearAll">清空全部</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 计算器全屏界面（支持键盘操作） ============ -->
    <div v-if="calc.open" class="calc-page">
      <header class="ed-top">
        <button class="back-btn" @click="closeCalc">‹ 返回</button>
        <span class="ed-title">🧮 计算器</span>
        <button class="ed-icon-btn del-btn" @click="calcClear" title="清空">C</button>
      </header>
      <div class="calc-body">
        <div class="calc-display">{{ calc.display }}</div>
        <div class="calc-pad">
          <button class="calc-key func" @click="calcClear">C</button>
          <button class="calc-key func" @click="calcBackspace">⌫</button>
          <button class="calc-key func" @click="calcPercent">%</button>
          <button class="calc-key op" @click="calcOp('÷')">÷</button>

          <button class="calc-key" @click="calcInput('7')">7</button>
          <button class="calc-key" @click="calcInput('8')">8</button>
          <button class="calc-key" @click="calcInput('9')">9</button>
          <button class="calc-key op" @click="calcOp('×')">×</button>

          <button class="calc-key" @click="calcInput('4')">4</button>
          <button class="calc-key" @click="calcInput('5')">5</button>
          <button class="calc-key" @click="calcInput('6')">6</button>
          <button class="calc-key op" @click="calcOp('-')">−</button>

          <button class="calc-key" @click="calcInput('1')">1</button>
          <button class="calc-key" @click="calcInput('2')">2</button>
          <button class="calc-key" @click="calcInput('3')">3</button>
          <button class="calc-key op" @click="calcOp('+')">＋</button>

          <button class="calc-key func" @click="calcNeg">±</button>
          <button class="calc-key" @click="calcInput('0')">0</button>
          <button class="calc-key" @click="calcDot">.</button>
          <button class="calc-key eq" @click="calcEqual">=</button>
        </div>
        <p class="calc-hint">键盘：0-9 / . / + - * ÷ / 回车或= / Backspace退格 / % / C清空 / Esc关闭</p>
      </div>
    </div>

    <!-- ============ 记忆点全屏编辑界面 ============ -->
    <div v-if="editing" class="mem-editor-page">
      <header class="ed-top">
        <button class="back-btn" @click="editing = null">‹ 返回</button>
        <span class="ed-title">编辑记忆点</span>
        <div class="ed-actions">
          <button class="ed-icon-btn star-btn" :class="{ on: editing.starred }" @click="toggleStar" :title="editing.starred ? '取消星标' : '标为星标（更高优先级）'">{{ editing.starred ? '★' : '☆' }}</button>
          <button class="ed-icon-btn del-btn" @click="removeFromEditor" title="删除这条记忆点">🗑 删除</button>
          <button class="alarm-btn start ed-save" @click="saveEdit">保存</button>
        </div>
      </header>
      <div class="ed-body">
        <input class="ed-title-input" v-model="editing.title" placeholder="标题" :maxlength="60" @keydown="onTitleKeydown" />
        <div class="ed-box">
          <textarea
            ref="bodyRef"
            v-model="editing.body"
            class="ed-textarea"
            :maxlength="3000"
            placeholder="在这里打字 · 回车保存 · ⌘+回车换行…"
            @keydown="onBodyKeydown"
          ></textarea>
          <div class="ed-count">{{ editing.body.length }}/3000</div>
        </div>
        <div class="ed-hint">↩ 回车 = 保存&nbsp;&nbsp;·&nbsp;&nbsp;⌘ / Ctrl + 回车 = 换行&nbsp;&nbsp;·&nbsp;&nbsp;★ 星标可提升优先级</div>
      </div>
    </div>

    <!-- ============ 任务全屏编辑界面 ============ -->
    <div v-if="taskEditing" class="mem-editor-page">
      <header class="ed-top">
        <button class="back-btn" @click="taskEditing = null">‹ 返回</button>
        <span class="ed-title">📋 编辑任务</span>
        <div class="ed-actions">
          <button class="ed-icon-btn del-btn" @click="removeTaskFromEditor" title="删除这个任务">🗑 删除</button>
          <button class="alarm-btn start ed-save" @click="saveTaskEdit">保存</button>
        </div>
      </header>
      <div class="ed-body task-editor">
        <div class="te-field">
          <label class="te-label">任务描述</label>
          <input class="te-title-input" v-model="taskEditing.title" placeholder="这个任务要做什么…" :maxlength="60" />
        </div>
        <div class="te-field">
          <label class="te-label">起止日期</label>
          <div class="task-date-row">
            <label class="task-date-item">
              <span class="task-date-icon">📅</span>
              <span class="task-date-label">起始日</span>
              <input type="date" class="task-date-input" v-model="taskEditing.startDate" />
            </label>
            <label class="task-date-item">
              <span class="task-date-icon">📅</span>
              <span class="task-date-label">截止日</span>
              <input type="date" class="task-date-input" v-model="taskEditing.endDate" />
            </label>
          </div>
        </div>
        <div class="te-field">
          <div class="te-steps-head">
            <label class="te-label">步骤清单</label>
            <span class="te-progress">{{ taskDone }}/{{ taskEditing.steps.length }} 已完成</span>
          </div>
          <div class="task-steps">
            <div v-for="(st, i) in taskEditing.steps" :key="i" class="task-step">
              <label class="task-check">
                <input type="checkbox" v-model="st.done" />
                <span :class="{ 'step-done': st.done }">{{ st.text || '（空步骤）' }}</span>
              </label>
              <button class="task-step-del" @click="taskEditing.steps.splice(i, 1)" title="删除步骤">×</button>
            </div>
            <p v-if="!taskEditing.steps.length" class="mem-empty">还没有步骤，在下方添加～</p>
          </div>
          <div class="task-add-step">
            <input v-model="newStepText" placeholder="添加一个步骤，回车确认…" :maxlength="120" @keyup.enter="addStep" />
            <button class="alarm-btn start task-add-step-btn" @click="addStep" :disabled="!newStepText.trim()">＋ 添加</button>
          </div>
        </div>
        <p class="ed-hint">数量 = 已完成步骤 / 总步骤 · 勾选步骤即为完成 · 保存后生效</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import XingyunAvatarAgent from '@xmov/avatar/agent'

const view = ref('home')
const stateText = ref('初始化中…')
const micText = ref('开始说话')
const inputText = ref('')
const running = ref(false)
const listening = ref(false)
const dark = ref(false)
const sidebarOpen = ref(false)
const taskPanelOpen = ref(false)

/* ============ 系统提示（仅灰字，无气泡） ============ */
const sysMsgs = reactive([])
function pushSys(line) { sysMsgs.push(line); if (sysMsgs.length > 20) sysMsgs.shift() }

/* ============ 兜底机制：减少崩坏、提高质量 ============
   1. 自称拦截：只在回答开头（可带问候词）自称豆包/AI助手时触发；
      拦截后清洗掉开头的自我介绍、继续念真实内容。
      若整句就是自我介绍（问“你是谁”），则念固定句。
      → 既不自称豆包，也不丢回答。
   2. 公式清洗：把 LaTeX/$$ 等转成口语或去掉，避免 [SDK 2404] 报错。
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
// 把公式/特殊符号转成口语或去掉，避免平台 LaTeX 报错
function speakClean(t) {
  return t
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/\\\([\s\S]*?\\\)/g, ' ')
    .replace(/\$[^$\n]{1,60}\$/g, ' ')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '（$1 分之 $2）')
    .replace(/\\(?:mathrm|text|operatorname)\{([^}]*)\}/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, 600)
}
function handleLLM(resp) {
  if (resp.isFirst) { llmBuffer = ''; fixing = false }
  if (resp.text) {
    llmBuffer += resp.text
    if (!fixing && isSelfClaimStart(llmBuffer)) {
      fixing = true
      try { agent?.interrupt() } catch (e) {}
      setTimeout(() => {
        const rest = stripSelfClaim(llmBuffer)
        const final = rest ? speakClean(rest) : FIXED_SELF
        try { agent?.speak(final) } catch (e) {}
      }, 500)
    }
  }
  if (resp.event === 'done' && !fixing && !llmBuffer.trim()) {
    setTimeout(() => { try { agent?.speak(FALLBACK_EMPTY) } catch (e) {} }, 600)
  }
}

/* ============ 记忆点 ============ */
const entries = ref([])
const editing = ref(null)
const bodyRef = ref(null)
const newTitle = ref('')
const carryMemory = ref(true)
const memory = reactive({ open: false })
const BODY_LIMIT = 3000
let idSeq = 1
const sortedEntries = computed(() => [...entries.value].sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0)))
function newEntry(kind, title, body) { return { id: idSeq++, kind, title, body: body || '', starred: false } }
function rememberAuto(text) {
  if (!text || !text.trim()) return
  const t = text.trim()
  entries.value.unshift(newEntry('auto', t.length > 40 ? t.slice(0, 40) + '…' : t, t))
}
function addEntry() { const v = newTitle.value.trim(); if (!v) return; entries.value.unshift(newEntry('pref', v, '')); newTitle.value = '' }
function openMemory() { memory.open = true }
function closeMemory() { memory.open = false }
function openEditor(en) { editing.value = en; nextTick(() => bodyRef.value?.focus()) }
function toggleStar() { if (editing.value) editing.value.starred = !editing.value.starred }
function saveEdit() {
  if (editing.value) { if (!editing.value.title.trim()) editing.value.title = '（无标题）'; if (editing.value.body.length > BODY_LIMIT) editing.value.body = editing.value.body.slice(0, BODY_LIMIT) }
  editing.value = null
}
function removeFromEditor() {
  if (!editing.value) return
  const i = entries.value.findIndex(e => e.id === editing.value.id)
  if (i > -1) entries.value.splice(i, 1)
  editing.value = null
}
function clearAll() { entries.value = [] }
function insertAtCursor(el, text) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  el.value = el.value.slice(0, start) + text + el.value.slice(end)
  if (el.value.length > BODY_LIMIT) el.value = el.value.slice(0, BODY_LIMIT)
  const pos = start + text.length
  el.setSelectionRange(pos, pos)
  el.dispatchEvent(new Event('input'))
}
function onBodyKeydown(e) {
  if (e.key !== 'Enter') return
  if (e.metaKey || e.ctrlKey) { e.preventDefault(); insertAtCursor(e.target, '\n') }
  else { e.preventDefault(); saveEdit() }
}
function onTitleKeydown(e) { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); saveEdit() } }
function buildContext() {
  const parts = []
  const prefs = entries.value.filter(e => e.kind === 'pref')
  if (prefs.length) parts.push('用户偏好：' + prefs.map(e => (e.starred ? '★' : '') + e.title + (e.body ? '：' + e.body : '')).join('；'))
  const autos = entries.value.filter(e => e.kind === 'auto').slice(0, 10)
  if (autos.length) parts.push('用户最近说过：' + autos.map(e => e.title).join(' / '))
  return parts.length ? parts.join('\n') + '\n' : ''
}

/* ============ 任务 ============ */
const tasks = ref([])
const taskEditing = ref(null)
const newTaskTitle = ref('')
const newStepText = ref('')
let taskIdSeq = 1001
const TASK_KEY = 'yimoyu_tasks_v1'
function loadTasks() {
  try {
    const raw = localStorage.getItem(TASK_KEY)
    if (raw) { tasks.value = JSON.parse(raw); taskIdSeq = tasks.value.reduce((m, t) => Math.max(m, t.id), 1000) + 1 }
  } catch (e) { tasks.value = [] }
}
function saveTasks() { try { localStorage.setItem(TASK_KEY, JSON.stringify(tasks.value)) } catch (e) {} }
function addTask() {
  const v = newTaskTitle.value.trim()
  if (!v) return
  tasks.value.unshift({ id: taskIdSeq++, title: v, startDate: '', endDate: '', steps: [] })
  newTaskTitle.value = ''
  saveTasks()
}
function openTaskPanel() { view.value = 'home'; taskPanelOpen.value = true }
function openTaskEditor(t) { taskEditing.value = t; newStepText.value = '' }
function saveTaskEdit() {
  if (taskEditing.value) { if (!taskEditing.value.title.trim()) taskEditing.value.title = '（无标题）'; if (!taskEditing.value.startDate) taskEditing.value.startDate = ''; if (!taskEditing.value.endDate) taskEditing.value.endDate = '' }
  taskEditing.value = null
  saveTasks()
}
function removeTaskFromEditor() {
  if (!taskEditing.value) return
  const i = tasks.value.findIndex(t => t.id === taskEditing.value.id)
  if (i > -1) tasks.value.splice(i, 1)
  taskEditing.value = null
  saveTasks()
}
function addStep() {
  const v = newStepText.value.trim()
  if (!v || !taskEditing.value) return
  taskEditing.value.steps.push({ text: v, done: false })
  newStepText.value = ''
}
const taskDone = computed(() => taskEditing.value ? taskEditing.value.steps.filter(s => s.done).length : 0)
const taskStat = computed(() => {
  let d = 0, t = 0
  tasks.value.forEach(x => { d += x.steps.filter(s => s.done).length; t += x.steps.length })
  return `${d}/${t} 完成`
})
function dateRange(t) {
  const s = t.startDate || '—'
  const e = t.endDate || '—'
  return `${s} — ${e}`
}

/* ============ 计算器 ============ */
const calc = reactive({ open: false, display: '0', acc: null, op: null, waiting: false })
function openCalc() { calc.open = true; calcClear() }
function closeCalc() { calc.open = false }
function calcInput(d) {
  if (calc.waiting) { calc.display = d; calc.waiting = false }
  else { calc.display = calc.display === '0' ? d : calc.display + d }
  if (calc.display.length > 14) calc.display = calc.display.slice(0, 14)
}
function calcDot() {
  if (calc.waiting) { calc.display = '0.'; calc.waiting = false }
  else if (!calc.display.includes('.')) calc.display += '.'
}
function calcOp(op) {
  const v = parseFloat(calc.display)
  if (calc.acc !== null && !calc.waiting) {
    const r = calcEval(calc.acc, v, calc.op)
    calc.display = calcTrim(r); calc.acc = r
  } else { calc.acc = v }
  calc.op = op; calc.waiting = true
}
function calcEval(a, b, op) {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '×') return a * b
  if (op === '÷') return b === 0 ? NaN : a / b
  return b
}
function calcEqual() {
  if (calc.op == null) return
  const r = calcEval(calc.acc, parseFloat(calc.display), calc.op)
  calc.display = calcTrim(r); calc.acc = null; calc.op = null; calc.waiting = true
}
function calcPercent() { calc.display = calcTrim(parseFloat(calc.display) / 100) }
function calcNeg() { calc.display = calc.display.startsWith('-') ? calc.display.slice(1) : (calc.display === '0' ? '0' : '-' + calc.display) }
function calcBackspace() {
  if (calc.waiting) return
  calc.display = calc.display.length > 1 ? calc.display.slice(0, -1) : '0'
}
function calcClear() { calc.display = '0'; calc.acc = null; calc.op = null; calc.waiting = false }
function calcTrim(n) {
  if (typeof n !== 'number' || isNaN(n)) return '错误'
  if (!isFinite(n)) return '∞'
  return String(Math.round(n * 1e12) / 1e12)
}
function onCalcKey(e) {
  if (!calc.open) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  const k = e.key
  if (k >= '0' && k <= '9') { e.preventDefault(); calcInput(k); return }
  if (k === '.') { e.preventDefault(); calcDot(); return }
  if (k === '+') { e.preventDefault(); calcOp('+'); return }
  if (k === '-') { e.preventDefault(); calcOp('-'); return }
  if (k === '*') { e.preventDefault(); calcOp('×'); return }
  if (k === '/') { e.preventDefault(); calcOp('÷'); return }
  if (k === '%') { e.preventDefault(); calcPercent(); return }
  if (k === 'Enter' || k === '=') { e.preventDefault(); calcEqual(); return }
  if (k === 'Backspace') { e.preventDefault(); calcBackspace(); return }
  if (k === 'Escape') { e.preventDefault(); closeCalc(); return }
  if (k === 'Delete' || k === 'C' || k === 'c') { e.preventDefault(); calcClear(); return }
}

const now = ref(new Date())
let clockTimer = null
function pad(n) { return n < 10 ? '0' + n : '' + n }
const nowStr = computed(() => {
  const d = now.value
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}）`
})

const weather = ref(null)
const weatherErr = ref('')
const weatherText = ref('')
const WMO = { 0: '晴', 1: '大致晴朗', 2: '多云', 3: '阴天', 45: '有雾', 48: '雾凇', 51: '毛毛雨', 53: '小雨', 55: '细雨', 61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪', 75: '大雪', 80: '阵雨', 81: '强阵雨', 82: '暴雨', 95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴' }
const WMO_ICON = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️' }
const weatherIcon = computed(() => WMO_ICON[weather.value?.code] ?? '🌤️')
async function loadWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=30.59&longitude=114.30&current_weather=true&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia/Shanghai')
    const data = await res.json()
    const w = data.current_weather
    weather.value = { temp: Math.round(w.temperature), wind: Math.round(w.windspeed), code: w.weathercode, max: Math.round(data.daily.temperature_2m_max[0]), min: Math.round(data.daily.temperature_2m_min[0]) }
    weatherText.value = WMO[w.weathercode] ?? `天气码 ${w.weathercode}`
  } catch (e) { weatherErr.value = '天气获取失败' }
}
const aqi = ref(null)
function aqiInfo(v) {
  if (v == null) return null
  if (v <= 50) return { label: '优', color: '#22c55e' }
  if (v <= 100) return { label: '良', color: '#eab308' }
  if (v <= 150) return { label: '轻度污染', color: '#f97316' }
  if (v <= 200) return { label: '中度污染', color: '#ef4444' }
  if (v <= 300) return { label: '重度污染', color: '#a855f7' }
  return { label: '严重污染', color: '#b91c1c' }
}
const aqiComputed = computed(() => aqiInfo(aqi.value))
async function loadAQI() {
  try {
    const res = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.59&longitude=114.30&current=us_aqi&timezone=Asia/Shanghai')
    const data = await res.json()
    aqi.value = Math.round(data.current.us_aqi)
  } catch (e) { aqi.value = null }
}
const speedResult = ref('监测中…')
const sampling = ref(false)
let speedTimer = null
function fmtSpeed(bps) {
  if (bps >= 1e6) return (bps / 1e6).toFixed(1) + ' MB/s'
  if (bps >= 1e3) return (bps / 1e3).toFixed(0) + ' KB/s'
  return bps.toFixed(0) + ' B/s'
}
async function sampleSpeed() {
  if (sampling.value) return
  sampling.value = true
  const bytes = 1 * 1024 * 1024
  const url = `https://speed.cloudflare.com/__down?bytes=${bytes}`
  try {
    const start = performance.now()
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status)
    const reader = res.body.getReader()
    let received = 0
    for (;;) { const { done, value } = await reader.read(); if (done) break; received += value.byteLength }
    const secs = (performance.now() - start) / 1000
    if (secs <= 0) throw new Error('计时异常')
    speedResult.value = fmtSpeed((received * 8) / secs)
  } catch (e) { speedResult.value = '监测中断' }
  finally { sampling.value = false }
}

let agent = null
/* 凭据从 .env 读取（.env 不入库，密钥脱敏） */
const APP_ID = import.meta.env.VITE_APP_ID || ''
const APP_SECRET = import.meta.env.VITE_APP_SECRET || ''
const GATEWAY = import.meta.env.VITE_GATEWAY || 'https://nebula-agent.xingyun3d.com/user/v1/ttsa_v2/session'

let audioCtx = null
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
}
function playAlarmSound(times = 3) {
  if (!audioCtx) return
  const notes = [523.25, 659.25, 783.99, 1046.5]
  let idx = 0
  const total = times * notes.length
  const step = () => {
    if (idx >= total) return
    const f = notes[idx % notes.length]
    const t = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t); osc.stop(t + 0.2)
    idx++; setTimeout(step, 220)
  }
  step()
}

const alarm = reactive({ open: false, hours: 0, minutes: 5, seconds: 0, total: 5 * 60, remain: 5 * 60, running: false, ringing: false })
let alarmTimer = null
function openAlarm() { alarm.open = true; alarm.ringing = false }
function openAlarmFromHome() { view.value = 'components'; alarm.open = true }
function closeAlarm() { alarm.open = false; if (alarm.ringing) alarm.ringing = false }
function adjust(unit, delta) {
  if (alarm.running) return
  if (unit === 'h') alarm.hours = (alarm.hours + delta + 24) % 24
  if (unit === 'm') alarm.minutes = (alarm.minutes + delta + 60) % 60
  if (unit === 's') alarm.seconds = (alarm.seconds + delta + 60) % 60
  syncTotal()
}
function syncTotal() { alarm.total = alarm.hours * 3600 + alarm.minutes * 60 + alarm.seconds; if (alarm.total <= 0) alarm.total = 1; alarm.remain = alarm.total }
function startAlarm() { ensureAudio(); syncTotal(); alarm.remain = alarm.total; alarm.ringing = false; alarm.running = true; runAlarmTimer() }
function togglePause() {
  if (alarm.ringing) { resetAlarm(); return }
  if (alarm.running) { stopAlarmTimer(); alarm.running = false }
  else { ensureAudio(); alarm.running = true; runAlarmTimer() }
}
function runAlarmTimer() {
  alarmTimer = setInterval(() => {
    alarm.remain--
    if (alarm.remain <= 0) {
      alarm.remain = 0; alarm.running = false; stopAlarmTimer(); alarm.ringing = true
      playAlarmSound()
      try { agent?.speak('时间到啦，该休息一下啦～') } catch (e) {}
    }
  }, 1000)
}
function resetAlarm() { stopAlarmTimer(); alarm.running = false; alarm.ringing = false; alarm.hours = 0; alarm.minutes = 5; alarm.seconds = 0; syncTotal() }
function stopAlarmTimer() { if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null } }
function fmtRemain(s) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}` }
const ringStyle = computed(() => { const circ = 2 * Math.PI * 52; const progress = alarm.total > 0 ? alarm.remain / alarm.total : 0; return { strokeDashoffset: circ * (1 - progress) } })

/* ============ 开场白 ============ */
const GREETING = '嘻嘻，你好呀朋友，我叫熠墨雨，是你的学习伙伴和倾听者，很高兴认识你！'
let greetTimer = null
function speakGreeting() {
  if (!agent) return
  if (agent.getAgentState() !== 'running') return
  clearTimeout(greetTimer)
  greetTimer = setTimeout(() => {
    if (agent.getAgentState() === 'running') { try { agent.speak(GREETING) } catch (e) {} }
  }, 4000)
}

onMounted(async () => {
  loadTasks()
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
  loadWeather(); loadAQI(); sampleSpeed()
  speedTimer = setInterval(sampleSpeed, 1000)
  window.addEventListener('keydown', onCalcKey)

  await nextTick()
  const container = document.getElementById('avatar-container')
  if (!container) { pushSys('容器不存在：检查 <div id="avatar-container"> 是否在模板'); return }
  agent = new XingyunAvatarAgent({
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
        if (!wasRunning && s === 'running' && listening.value) { agent?.startASR() }
      },
      onASRStateChange(s) { listening.value = s === 'listening'; micText.value = listening.value ? '停止说话' : '开始说话' },
      onASRResult(r) { if (r.isFinal) rememberAuto(r.text) },
      onLLMResponse: handleLLM,
      onError(error) { pushSys(`[${error.domain}] ${error.code}: ${error.message}`) },
    },
  })
  await agent.init()
  window.__agent = agent
  if (agent.getAgentState() === 'running') speakGreeting()
  else pushSys('初始化未进入 running，请看上方报错')
})

async function toggleMic() { ensureAudio(); if (listening.value) await agent.stopASR(); else await agent.startASR() }
async function sendAsk() {
  ensureAudio()
  if (!running.value || !inputText.value) return
  const text = inputText.value
  inputText.value = ''
  rememberAuto(text)
  const payload = carryMemory.value ? buildContext() + text : text
  try { await agent.ask(payload) } catch (e) {}
}
function onInterrupt() { ensureAudio(); try { agent.interrupt() } catch (e) {} }
function reloadPage() { window.location.reload() }

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (speedTimer) clearInterval(speedTimer)
  if (greetTimer) clearTimeout(greetTimer)
  stopAlarmTimer()
  window.removeEventListener('keydown', onCalcKey)
  try { agent?.destroy() } catch (e) {}
})
</script>

<style scoped>
/* ============ 主题变量 ============ */
.page {
  --bg-base: linear-gradient(180deg, #f6fbf6 0%, #e9f4ee 100%);
  --glow1: rgba(76,208,125,0.32); --glow2: rgba(79,155,255,0.34); --glow3: rgba(255,213,79,0.28);
  --text-main: #26352f; --text-sub: #6b8a7d;
  --brand-grad: linear-gradient(90deg, #37a76c, #5a7fd6);
  --frame-grad: linear-gradient(135deg, rgba(76,208,125,0.60), rgba(255,213,79,0.55), rgba(79,155,255,0.60));
  --frame-bg: #f0f7f2;
  --ai-bg: rgba(255,255,255,0.82); --ai-border: #dcebe2; --ai-text: #2f4038;
  --user-grad: linear-gradient(135deg, #54c77e, #6aa6ff);
  --sys-text: #c0882f;
  --input-bg: rgba(255,255,255,0.82); --input-border: #d7e7dd; --placeholder: #9ab0a3;
  --btn-mic-bg: #ffffff; --btn-mic-text: #2f7d54; --btn-mic-border: #cde5d5;
  --btn-send-grad: linear-gradient(135deg, #54c77e, #6aa6ff);
  --btn-stop-bg: #ffffff; --btn-stop-text: #c78a2f; --btn-stop-border: #f0e0b8;
  --pill-bg: rgba(255,255,255,0.75); --pill-border: #d7e7dd; --pill-text: #5a7d6e; --pill-dot: #9fc0ae;
  --pill-on-text: #2f7d54; --pill-on-dot: linear-gradient(135deg, #54c77e, #6aa6ff);
  --theme-btn-bg: rgba(255,255,255,0.8); --theme-btn-text: #3c7a5a; --theme-btn-border: #cfe5d6;
  --card-bg: rgba(255,255,255,0.75); --card-border: #d7e7dd; --card-title: #6b8a7d;
  --subtitle-bg: #1f2b24; --subtitle-text: #ffffff;
}
.page.dark {
  --bg-base: linear-gradient(180deg, #0d0f1e 0%, #141731 100%);
  --glow1: rgba(255,77,107,0.34); --glow2: rgba(79,107,255,0.38); --glow3: rgba(255,77,107,0.26);
  --text-main: #e8ebf4; --text-sub: #8f98c2;
  --brand-grad: linear-gradient(90deg, #ffb3c0, #b6c3ff);
  --frame-grad: linear-gradient(135deg, rgba(255,77,107,0.55), rgba(79,107,255,0.55));
  --frame-bg: #10132a;
  --ai-bg: rgba(30,34,66,0.75); --ai-border: rgba(120,132,210,0.25); --ai-text: #e6e9f6;
  --user-grad: linear-gradient(135deg, rgba(255,77,107,0.9), rgba(79,107,255,0.9));
  --sys-text: #ffb3a0;
  --input-bg: rgba(24,28,58,0.7); --input-border: rgba(130,140,210,0.3); --placeholder: #6d77a0;
  --btn-mic-bg: rgba(28,32,66,0.8); --btn-mic-text: #c6d0ff; --btn-mic-border: rgba(130,140,210,0.35);
  --btn-send-grad: linear-gradient(135deg, #ff4d6b, #4f6bff);
  --btn-stop-bg: rgba(28,32,66,0.8); --btn-stop-text: #ffb3a0; --btn-stop-border: rgba(255,120,120,0.3);
  --pill-bg: rgba(20,23,49,0.6); --pill-border: rgba(130,140,210,0.25); --pill-text: #a4aed0; --pill-dot: #5a6a95;
  --pill-on-text: #c6d0ff; --pill-on-dot: linear-gradient(135deg, #ff4d6b, #4f6bff);
  --theme-btn-bg: rgba(28,32,66,0.8); --theme-btn-text: #c6d0ff; --theme-btn-border: rgba(130,140,210,0.35);
  --card-bg: rgba(24,28,58,0.6); --card-border: rgba(130,140,210,0.25); --card-title: #8f98c2;
  --subtitle-bg: #262b3d; --subtitle-text: #eef0fb;
}

.page {
  min-height: 100vh;
  display: flex; flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "HarmonicOS Sans", "Microsoft YaHei", sans-serif;
  font-weight: 400; font-size: 15px; line-height: 1.6; letter-spacing: 0.01em;
  color: var(--text-main); background: var(--bg-base);
  margin: 0; position: relative; overflow: hidden;
  transition: background 0.4s ease, color 0.4s ease;
}
.page::before, .page::after { content: ""; position: fixed; inset: -25%; pointer-events: none; z-index: 0; filter: blur(70px); }
.page::before {
  background:
    radial-gradient(circle at 28% 22%, var(--glow1), transparent 42%),
    radial-gradient(circle at 74% 28%, var(--glow2), transparent 42%);
  animation: driftA 18s ease-in-out infinite;
}
.page::after {
  background:
    radial-gradient(circle at 72% 72%, var(--glow2), transparent 42%),
    radial-gradient(circle at 22% 62%, var(--glow3), transparent 42%);
  animation: driftB 24s ease-in-out infinite reverse;
}
@keyframes driftA {
  0%   { transform: translate(0, 0) scale(1);   opacity: 0.85; }
  50%  { transform: translate(9%, 7%) scale(1.2); opacity: 1;   }
  100% { transform: translate(0, 0) scale(1);   opacity: 0.85; }
}
@keyframes driftB {
  0%   { transform: translate(0, 0) scale(1);   opacity: 0.8; }
  50%  { transform: translate(-8%, -6%) scale(1.25); opacity: 1; }
  100% { transform: translate(0, 0) scale(1);   opacity: 0.8; }
}

.topbar { display: flex; align-items: center; justify-content: space-between; padding: 22px 34px; position: relative; z-index: 1; }
.top-right { display: flex; align-items: center; gap: 12px; }
.alarm-chip {
  border: 1px solid var(--theme-btn-border); background: var(--theme-btn-bg); color: var(--theme-btn-text);
  font-size: 12.5px; font-weight: 500; font-variant-numeric: tabular-nums;
  padding: 7px 14px; border-radius: 999px; cursor: pointer; transition: all 0.2s ease;
}
.alarm-chip:hover { filter: brightness(1.05); }
.alarm-chip.ring { animation: chipPulse 0.8s ease-in-out infinite; border-color: var(--pill-on-dot); color: var(--pill-on-text); }
@keyframes chipPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.brand { display: flex; align-items: center; gap: 12px; }
.brand-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--brand-grad); box-shadow: 0 0 12px var(--glow1), 0 0 20px var(--glow2); }
.brand-text h1 {
  margin: 0; font-size: 20px; font-weight: 500;
  background: var(--brand-grad); -webkit-background-clip: text; background-clip: text;
  color: transparent; letter-spacing: 0.04em;
}
.brand-text p { margin: 2px 0 0; font-size: 12.5px; color: var(--text-sub); letter-spacing: 0.12em; }
.theme-toggle {
  border: 1px solid var(--theme-btn-border); background: var(--theme-btn-bg); color: var(--theme-btn-text);
  font-size: 12.5px; font-weight: 400; padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all 0.2s ease;
}
.theme-toggle:hover { filter: brightness(1.05); }
.status-pill {
  display: flex; align-items: center; gap: 8px; padding: 7px 16px; border-radius: 999px;
  font-size: 13px; color: var(--pill-text); background: var(--pill-bg); border: 1px solid var(--pill-border);
}
.status-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pill-dot); }
.status-pill.on { color: var(--pill-on-text); }
.status-pill.on .dot { background: var(--pill-on-dot); box-shadow: 0 0 8px var(--glow1), 0 0 14px var(--glow2); }

.body { flex: 1; display: flex; gap: 20px; padding: 4px 40px 0; position: relative; z-index: 1; min-height: 0; transition: padding 0.35s ease; }
.body.chat-open { padding-right: 356px; }
.sidebar { width: 0; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; overflow: hidden; transition: width 0.3s ease; }
.sidebar.open { width: 250px; }
.sb-content { width: 100%; display: flex; flex-direction: column; gap: 14px; }
.card {
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px;
  padding: 16px 18px; box-shadow: 0 12px 30px -18px rgba(0,0,0,0.25);
  transition: background 0.3s ease, border 0.3s ease;
}
.card-title { font-size: 12.5px; color: var(--card-title); letter-spacing: 0.08em; margin-bottom: 10px; }
.clock { font-size: 16px; font-weight: 500; line-height: 1.5; color: var(--text-main); }
.weather .w-top { display: flex; align-items: center; gap: 10px; }
.weather .w-icon { font-size: 36px; line-height: 1; }
.weather .w-temp { font-size: 36px; font-weight: 500; color: var(--text-main); }
.weather .w-desc { font-size: 14px; color: var(--text-sub); margin-top: 2px; }
.weather .w-range { font-size: 12.5px; color: var(--text-sub); margin-top: 6px; }
.weather .w-aqi { font-size: 12.5px; font-weight: 500; margin-top: 4px; }
.weather .w-sub { font-size: 12px; color: var(--text-sub); margin-top: 2px; }
.w-loading { font-size: 13px; color: var(--text-sub); }
.speed-value { font-size: 24px; font-weight: 500; color: var(--text-main); line-height: 1.3; }
.speed-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-sub); margin-top: 6px; }
.speed-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pill-dot); }
.speed-sub.live { color: var(--pill-on-text); }
.speed-sub.live .speed-dot { background: var(--pill-on-dot); box-shadow: 0 0 8px var(--glow1), 0 0 12px var(--glow2); }
.more-entry { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; transition: all 0.2s ease; }
.more-entry:hover { filter: brightness(1.05); }
.more-label { font-size: 13.5px; font-weight: 500; letter-spacing: 0.05em; color: var(--text-main); }
.more-arrow { font-size: 16px; line-height: 1; color: var(--card-title); transition: transform 0.3s ease; }

.main-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.stage { flex: 1; display: flex; justify-content: center; align-items: center; min-height: 0; }
.frame {
  width: min(640px, 100%); height: 100%; max-height: 400px; border-radius: 24px; padding: 2px;
  background: var(--frame-grad);
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.25), 0 0 40px -8px var(--glow1), 0 0 40px -8px var(--glow2);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  transition: max-width 0.35s ease, max-height 0.35s ease, background 0.4s ease;
}
.body.chat-open .frame { max-width: 460px; max-height: 340px; }
#avatar-container {
  width: 100%; height: 100%; border-radius: 22px; background: var(--frame-bg);
  overflow: hidden;
  transform: translateX(-4.5%) scale(1.08);
  transform-origin: center center;
  transition: transform 0.35s ease, background 0.4s ease;
}
.body.chat-open #avatar-container { transform: translateX(-7%) scale(1.14); }
.chat { padding: 10px 8px 8px; max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.msg { margin: 2px 0; font-size: 12px; color: var(--sys-text); padding: 2px 4px; }
.msg.sys { align-self: center; text-align: center; }

.dock { padding: 8px 6px 16px; }
.input-wrap {
  display: flex; gap: 10px; align-items: center; padding: 8px;
  background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 16px;
  box-shadow: 0 16px 40px -18px rgba(0,0,0,0.25); max-width: 760px; margin: 0 auto;
  transition: background 0.3s ease, border 0.3s ease;
}
.input-wrap input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14.5px; font-weight: 400; color: var(--text-main); padding: 8px 10px;
}
.input-wrap input::placeholder { color: var(--placeholder); }
.btn { border: none; border-radius: 11px; cursor: pointer; font-size: 13.5px; font-weight: 400; padding: 9px 16px; transition: all 0.18s ease; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mic { background: var(--btn-mic-bg); color: var(--btn-mic-text); border: 1px solid var(--btn-mic-border); }
.mic:hover:not(:disabled) { filter: brightness(0.98); }
.send { background: var(--btn-send-grad); color: #fff; box-shadow: 0 6px 18px -6px var(--glow2); }
.send:hover:not(:disabled) { filter: brightness(1.06); }
.stop { background: var(--btn-stop-bg); color: var(--btn-stop-text); border: 1px solid var(--btn-stop-border); }
.stop:hover:not(:disabled) { filter: brightness(0.98); }
.reload {
  background: var(--btn-mic-bg); color: var(--btn-mic-text);
  border: 1px solid var(--btn-mic-border); font-size: 17px; line-height: 1;
  padding: 8px 13px;
}
.reload:hover:not(:disabled) { filter: brightness(0.98); }

/* ============ 左右侧折叠手柄 ============ */
.side-toggle {
  position: fixed; top: 50%; transform: translateY(-50%); z-index: 26;
  width: 36px; height: 72px; border-radius: 18px 0 0 18px;
  background: var(--card-bg); border: 1px solid var(--card-border);
  color: var(--card-title); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 22px -10px rgba(0,0,0,0.3); transition: all 0.2s ease;
}
.side-toggle:hover { filter: brightness(1.05); }
.side-toggle .side-arrow { font-size: 22px; line-height: 1; display: inline-block; transition: transform 0.3s ease; }
.left-toggle { left: 0; border-radius: 0 18px 18px 0; }
.left-toggle .side-arrow.open { transform: rotate(180deg); }
.right-toggle { right: 0; border-radius: 18px 0 0 18px; }
.right-toggle .side-arrow.open { transform: rotate(180deg); }

/* ============ 右侧任务面板 ============ */
.chat-panel {
  position: fixed; top: 0; right: 0; height: 100vh; width: 340px; z-index: 20;
  background: var(--card-bg); border-left: 1px solid var(--card-border);
  backdrop-filter: blur(10px);
  display: flex; flex-direction: column;
  transform: translateX(102%); transition: transform 0.35s ease;
}
.chat-panel.open { transform: translateX(0); }
.cp-head { padding: 20px 22px 14px; border-bottom: 1px solid var(--card-border); }
.cp-title { font-size: 16px; font-weight: 600; color: var(--text-main); letter-spacing: 0.03em; display: flex; align-items: baseline; gap: 8px; }
.cp-stat { font-size: 12px; font-weight: 500; color: var(--btn-mic-text); background: var(--btn-mic-bg); border: 1px solid var(--btn-mic-border); padding: 1px 10px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.cp-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.cp-add { display: flex; gap: 8px; }
.cp-add input {
  flex: 1; min-width: 0; border: 1px solid var(--input-border); background: var(--input-bg);
  font-size: 13.5px; color: var(--text-main); padding: 9px 12px; border-radius: 11px; outline: none;
}
.cp-add input::placeholder { color: var(--placeholder); }
.cp-add-btn { flex-shrink: 0; padding: 8px 14px; font-size: 15px; line-height: 1; }
.cp-task {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: var(--ai-bg); border: 1px solid var(--ai-border); border-radius: 14px;
  padding: 12px 14px; cursor: pointer; transition: background 0.3s ease, border 0.3s ease;
}
.cp-task:hover { filter: brightness(1.03); }
.cp-task-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.cp-task-title { font-size: 14px; font-weight: 500; color: var(--text-main); word-break: break-word; }
.cp-task-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cp-task-dates { font-size: 11px; color: var(--card-title); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-task-ratio { flex-shrink: 0; font-size: 12px; font-weight: 600; color: var(--btn-mic-text); background: var(--btn-mic-bg); border: 1px solid var(--btn-mic-border); padding: 1px 10px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.cp-task-arrow { flex-shrink: 0; font-size: 16px; color: var(--card-title); line-height: 1; }
.cp-empty { font-size: 13px; color: var(--card-title); text-align: center; margin-top: 20px; }

/* ============ 组件库浮层 ============ */
.comp-overlay { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; background: var(--bg-base); overflow-y: auto; }
.comp-overlay::before {
  content: ""; position: fixed; inset: -25%; pointer-events: none; filter: blur(70px);
  background:
    radial-gradient(circle at 28% 22%, var(--glow1), transparent 42%),
    radial-gradient(circle at 74% 28%, var(--glow2), transparent 42%);
  animation: driftA 18s ease-in-out infinite;
}
.comp-topbar { display: flex; align-items: center; gap: 18px; padding: 24px 34px; position: relative; z-index: 1; }
.back-btn {
  border: 1px solid var(--theme-btn-border); background: var(--theme-btn-bg); color: var(--theme-btn-text);
  font-size: 14px; font-weight: 500; padding: 8px 18px; border-radius: 999px; cursor: pointer; transition: all 0.2s ease;
}
.back-btn:hover { filter: brightness(1.05); }
.comp-title h1 {
  margin: 0; font-size: 22px; font-weight: 600;
  background: var(--brand-grad); -webkit-background-clip: text; background-clip: text;
  color: transparent; letter-spacing: 0.04em;
}
.comp-title p { margin: 2px 0 0; font-size: 13px; color: var(--text-sub); }
.comp-main { flex: 1; position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 34px 40px; min-height: 0; }
.comp-grid { width: 100%; max-width: 640px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
.comp-tile {
  height: 190px; border-radius: 22px; border: 1px solid var(--card-border); background: var(--card-bg);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
  cursor: pointer; transition: all 0.25s ease; box-shadow: 0 14px 32px -20px rgba(0,0,0,0.35);
}
.comp-tile:hover { filter: brightness(1.04); transform: translateY(-3px); border-color: var(--btn-send-grad); box-shadow: 0 20px 44px -22px var(--glow2); }
.comp-tile .tile-icon { font-size: 42px; line-height: 1; }
.comp-tile .tile-name { font-size: 16px; font-weight: 600; color: var(--text-main); letter-spacing: 0.05em; }
.comp-tile .tile-sub { font-size: 12.5px; color: var(--text-sub); }
.comp-hint { margin-top: 30px; font-size: 13px; color: var(--text-sub); }

.alarm-mask {
  position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
}
.alarm-panel {
  width: 340px; border-radius: 26px; padding: 26px 28px;
  background: var(--card-bg); border: 1px solid var(--card-border);
  box-shadow: 0 30px 70px -24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; align-items: center;
}
.alarm-panel.ring { animation: ringPulse 0.9s ease-in-out infinite; }
@keyframes ringPulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--glow1), 0 30px 70px -24px rgba(0,0,0,0.4); }
  50% { box-shadow: 0 0 0 10px transparent, 0 30px 70px -20px var(--glow2); }
}
.alarm-head { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.alarm-title { font-size: 15px; font-weight: 600; color: var(--text-main); }
.alarm-close { border: none; background: transparent; cursor: pointer; font-size: 20px; color: var(--text-sub); line-height: 1; }
.picker { display: flex; gap: 6px; margin-bottom: 18px; }
.picker-col {
  display: flex; flex-direction: column; align-items: center; width: 92px; gap: 2px;
  border-radius: 16px; padding: 8px 4px; background: var(--card-bg);
}
.pk-btn { border: none; background: transparent; cursor: pointer; color: var(--text-sub); font-size: 17px; line-height: 1; padding: 5px 12px; border-radius: 8px; transition: all 0.15s ease; }
.pk-btn:hover { background: var(--card-border); color: var(--text-main); }
.pk-val { font-size: 42px; font-weight: 300; color: var(--text-main); font-variant-numeric: tabular-nums; line-height: 1.15; }
.pk-label { font-size: 11px; color: var(--text-sub); letter-spacing: 0.08em; }
.ring-wrap { position: relative; width: 170px; height: 170px; margin-bottom: 16px; }
.ring-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: var(--card-border); stroke-width: 8; }
.ring-fg { fill: none; stroke: var(--btn-send-grad); stroke-width: 8; stroke-linecap: round; stroke-dasharray: 326.7; transition: stroke-dashoffset 0.3s linear; }
.ring-time { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 600; color: var(--text-main); font-variant-numeric: tabular-nums; }
.ring-msg { margin-bottom: 14px; font-size: 13px; font-weight: 500; color: var(--pill-on-text); }
.ring-msg.subtle { color: var(--text-sub); font-weight: 400; }
.alarm-actions { display: flex; gap: 10px; }
.alarm-btn { border: none; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; padding: 10px 24px; transition: all 0.18s ease; }
.alarm-btn.start { background: var(--btn-send-grad); color: #fff; }
.alarm-btn.start:hover { filter: brightness(1.06); }
.alarm-btn.reset { background: var(--btn-stop-bg); color: var(--btn-stop-text); border: 1px solid var(--btn-stop-border); }
.alarm-btn.reset:hover { filter: brightness(0.98); }

/* ============ 记忆面板（浮层内） ============ */
.memory-panel {
  width: 460px; max-height: 84vh; overflow-y: auto; border-radius: 26px; padding: 24px 26px;
  background: var(--card-bg); border: 1px solid var(--card-border);
  box-shadow: 0 30px 70px -24px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
}
.mem-sec-title { font-size: 12.5px; color: var(--card-title); letter-spacing: 0.08em; margin: 12px 0 8px; }
.mem-add { display: flex; gap: 8px; margin-bottom: 8px; }
.mem-add input {
  flex: 1; border: 1px solid var(--input-border); background: var(--input-bg);
  font-size: 13.5px; color: var(--text-main); padding: 8px 12px; border-radius: 10px; outline: none;
}
.mem-add-btn { padding: 8px 14px; }
.mem-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
.mem-item {
  background: var(--ai-bg); border: 1px solid var(--ai-border); border-radius: 12px;
  cursor: pointer; transition: background 0.3s ease, border 0.3s ease;
}
.mem-item:hover { filter: brightness(1.03); }
.mem-row { display: flex; align-items: center; gap: 8px; padding: 11px 12px; user-select: none; }
.mem-star { flex-shrink: 0; font-size: 13px; color: var(--card-title); }
.mem-star.on { color: #f5b301; text-shadow: 0 0 8px rgba(245,179,1,0.6); }
.mem-kind { flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 500; }
.mem-kind.pref { background: var(--btn-mic-bg); color: var(--btn-mic-text); border: 1px solid var(--btn-mic-border); }
.mem-kind.auto { background: var(--btn-stop-bg); color: var(--btn-stop-text); border: 1px solid var(--btn-stop-border); }
.mem-title { flex: 1; font-size: 13px; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mem-count { flex-shrink: 0; font-size: 11px; color: var(--card-title); font-variant-numeric: tabular-nums; }
.mem-arrow { flex-shrink: 0; font-size: 15px; color: var(--card-title); line-height: 1; }
.mem-empty { font-size: 13px; color: var(--text-sub); }
.mem-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
.switch { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-sub); cursor: pointer; }
.switch input { accent-color: var(--btn-send-grad); }

/* ============ 计算器 ============ */
.calc-page { position: fixed; inset: 0; z-index: 70; display: flex; flex-direction: column; background: var(--bg-base); overflow: hidden; }
.calc-page::before {
  content: ""; position: fixed; inset: -25%; pointer-events: none; filter: blur(70px);
  background:
    radial-gradient(circle at 28% 22%, var(--glow1), transparent 42%),
    radial-gradient(circle at 74% 28%, var(--glow2), transparent 42%);
  animation: driftA 18s ease-in-out infinite;
}
.calc-body { flex: 1; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 18px; padding: 10px 34px 40px; justify-content: center; max-width: 460px; margin: 0 auto; width: 100%; box-sizing: border-box; }
.calc-display {
  background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 18px;
  font-size: 44px; font-weight: 300; color: var(--text-main); font-variant-numeric: tabular-nums;
  padding: 18px 22px; text-align: right; overflow: hidden; white-space: nowrap; letter-spacing: 0.02em;
  min-height: 84px; display: flex; align-items: center; justify-content: flex-end;
}
.calc-pad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.calc-key {
  height: 68px; border: none; border-radius: 16px; cursor: pointer;
  font-size: 22px; font-weight: 500; color: var(--text-main);
  background: var(--card-bg); border: 1px solid var(--card-border);
  transition: all 0.15s ease;
}
.calc-key:hover { filter: brightness(1.05); transform: translateY(-1px); }
.calc-key:active { transform: translateY(0); filter: brightness(0.97); }
.calc-key.func { color: var(--btn-stop-text); background: var(--btn-stop-bg); border-color: var(--btn-stop-border); }
.calc-key.op { color: #fff; background: var(--btn-send-grad); border-color: transparent; }
.calc-key.eq { color: #fff; background: var(--btn-send-grad); border-color: transparent; }
.calc-hint { font-size: 12.5px; color: var(--card-title); text-align: center; letter-spacing: 0.02em; }

/* ============ 任务编辑界面 ============ */
.task-editor { flex: 1; max-width: 680px; margin: 0 auto; width: 100%; box-sizing: border-box; padding-top: 18px; }
.te-field { display: flex; flex-direction: column; gap: 10px; }
.te-label { font-size: 12.5px; color: var(--card-title); letter-spacing: 0.08em; }
.te-title-input {
  border: 1px solid var(--input-border); background: var(--input-bg);
  font-size: 18px; font-weight: 500; color: var(--text-main); padding: 14px 18px; border-radius: 16px; outline: none;
  transition: border 0.2s ease, box-shadow 0.2s ease;
}
.te-title-input:focus { border-color: var(--btn-send-grad); box-shadow: 0 0 0 3px var(--glow2); }
.te-steps-head { display: flex; align-items: center; justify-content: space-between; }
.te-progress { font-size: 12px; font-weight: 600; color: var(--btn-mic-text); background: var(--btn-mic-bg); border: 1px solid var(--btn-mic-border); padding: 2px 12px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.task-date-row { display: flex; gap: 14px; }
.task-date-item {
  flex: 1; display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 8px;
  background: var(--ai-bg); border: 1px solid var(--ai-border); border-radius: 14px; padding: 12px 14px;
}
.task-date-icon { font-size: 18px; line-height: 1; }
.task-date-label { font-size: 12px; color: var(--card-title); white-space: nowrap; }
.task-date-input { border: none; background: transparent; font-size: 13.5px; color: var(--text-main); outline: none; min-width: 0; }
.task-date-input::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
.task-steps { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.task-step {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  background: var(--ai-bg); border: 1px solid var(--ai-border); border-radius: 12px;
  padding: 12px 14px; transition: border 0.2s ease, background 0.3s ease;
}
.task-step:hover { border-color: var(--btn-send-grad); }
.task-check { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; cursor: pointer; }
.task-check input { flex-shrink: 0; width: 17px; height: 17px; accent-color: var(--btn-send-grad); cursor: pointer; }
.task-check span { font-size: 13.5px; color: var(--text-main); word-break: break-word; }
.task-check span.step-done { text-decoration: line-through; color: var(--card-title); }
.task-step-del { border: none; background: transparent; cursor: pointer; color: var(--card-title); font-size: 17px; line-height: 1; flex-shrink: 0; padding: 0 2px; }
.task-step-del:hover { color: var(--btn-stop-text); }
.task-add-step { display: flex; gap: 8px; margin-top: 4px; }
.task-add-step input {
  flex: 1; border: 1px solid var(--input-border); background: var(--input-bg);
  font-size: 13.5px; color: var(--text-main); padding: 10px 14px; border-radius: 12px; outline: none;
}
.task-add-step input:focus { border-color: var(--btn-send-grad); }
.task-add-step-btn { padding: 9px 16px; }

/* ============ 记忆 / 任务 共用全屏编辑界面 ============ */
.mem-editor-page { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; background: var(--bg-base); overflow: hidden; }
.mem-editor-page::before {
  content: ""; position: fixed; inset: -25%; pointer-events: none; filter: blur(70px);
  background:
    radial-gradient(circle at 28% 22%, var(--glow1), transparent 42%),
    radial-gradient(circle at 74% 28%, var(--glow2), transparent 42%);
  animation: driftA 18s ease-in-out infinite;
}
.ed-top { display: flex; align-items: center; justify-content: space-between; padding: 22px 34px; position: relative; z-index: 1; }
.ed-title { font-size: 18px; font-weight: 600; color: var(--text-main); letter-spacing: 0.03em; }
.ed-actions { display: flex; align-items: center; gap: 10px; }
.ed-icon-btn {
  border: 1px solid var(--theme-btn-border); background: var(--theme-btn-bg); color: var(--theme-btn-text);
  font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 999px; cursor: pointer; transition: all 0.2s ease;
}
.ed-icon-btn:hover { filter: brightness(1.05); }
.ed-icon-btn.star-btn { font-size: 16px; padding: 6px 14px; }
.ed-icon-btn.star-btn.on { color: #f5b301; border-color: #f5b301; box-shadow: 0 0 12px rgba(245,179,1,0.35); }
.ed-icon-btn.del-btn { color: var(--btn-stop-text); border-color: var(--btn-stop-border); }
.ed-save { padding: 8px 24px; }
.ed-body { flex: 1; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 14px; padding: 6px 34px 34px; min-height: 0; }
.ed-title-input {
  border: 1px solid var(--input-border); background: var(--input-bg);
  font-size: 16px; font-weight: 500; color: var(--text-main); padding: 12px 16px; border-radius: 14px; outline: none;
}
.ed-box { flex: 1; position: relative; display: flex; min-height: 0; }
.ed-textarea {
  flex: 1; width: 100%; box-sizing: border-box; border: 1px solid var(--input-border); background: var(--input-bg);
  font-size: 14.5px; line-height: 1.7; color: var(--text-main); padding: 16px 18px 34px;
  border-radius: 16px; outline: none; resize: none; font-family: inherit;
}
.ed-textarea::placeholder { color: var(--placeholder); }
.ed-count {
  position: absolute; right: 14px; bottom: 10px; font-size: 11px; color: var(--card-title);
  font-variant-numeric: tabular-nums;
}
.ed-hint { font-size: 12.5px; color: var(--card-title); letter-spacing: 0.02em; }
</style>