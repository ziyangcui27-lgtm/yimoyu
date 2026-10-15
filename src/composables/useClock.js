import { ref, computed } from 'vue'

// 时钟模块：实时时间显示。start() 每秒刷新，stop() 清理定时器。
export function useClock() {
  const now = ref(new Date())

  let clockTimer = null

  function pad(n) { return n < 10 ? '0' + n : '' + n }

  const nowStr = computed(() => {
    const d = now.value
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}）`
  })

  function start() {
    stop()
    clockTimer = setInterval(() => { now.value = new Date() }, 1000)
  }

  function stop() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
  }

  return { now, nowStr, pad, start, stop }
}
