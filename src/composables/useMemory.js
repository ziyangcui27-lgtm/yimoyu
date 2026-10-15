import { ref, reactive, computed, nextTick } from 'vue'

// 记忆模块：自动/手动记忆点 + 上下文拼接（发送时携带给 AI）。
export function useMemory() {
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

  // 自动记录一句话记忆（长度超过 40 截断为标题）
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

  // 把记忆拼成一段上下文文本，随用户消息一起发送
  function buildContext() {
    const parts = []
    const prefs = entries.value.filter(e => e.kind === 'pref')
    if (prefs.length) parts.push('用户偏好：' + prefs.map(e => (e.starred ? '★' : '') + e.title + (e.body ? '：' + e.body : '')).join('；'))
    const autos = entries.value.filter(e => e.kind === 'auto').slice(0, 10)
    if (autos.length) parts.push('用户最近说过：' + autos.map(e => e.title).join(' / '))
    return parts.length ? parts.join('\n') + '\n' : ''
  }

  return {
    entries, editing, bodyRef, newTitle, carryMemory, memory, sortedEntries,
    rememberAuto, addEntry, openMemory, closeMemory, openEditor, toggleStar,
    saveEdit, removeFromEditor, clearAll, onBodyKeydown, onTitleKeydown, buildContext,
  }
}
