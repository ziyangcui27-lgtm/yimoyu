import { ref, computed } from 'vue'

// 任务模块：任务清单 + 步骤 + 起止日期，localStorage 持久化。
export function useTasks() {
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

  return {
    tasks, taskEditing, newTaskTitle, newStepText, loadTasks, saveTasks, addTask,
    openTaskEditor, saveTaskEdit, removeTaskFromEditor, addStep, taskDone, taskStat, dateRange,
  }
}
