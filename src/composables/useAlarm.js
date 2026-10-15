import { reactive, computed } from 'vue'
import { ensureAudio, playAlarmSound } from './audio'

// 闹钟模块：计时 + 到点铃声 + 数字人语音提醒。
// 参数 options.speak 是 App 注入的语音回调：options.speak('时间到啦，该休息一下啦～')
export function useAlarm({ speak } = {}) {
  const alarm = reactive({ open: false, hours: 0, minutes: 5, seconds: 0, total: 5 * 60, remain: 5 * 60, running: false, ringing: false })

  let alarmTimer = null

  function pad(n) { return n < 10 ? '0' + n : '' + n }

  function openAlarm() { alarm.open = true; alarm.ringing = false }
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
        try { speak?.('时间到啦，该休息一下啦～') } catch (e) {}
      }
    }, 1000)
  }

  function resetAlarm() { stopAlarmTimer(); alarm.running = false; alarm.ringing = false; alarm.hours = 0; alarm.minutes = 5; alarm.seconds = 0; syncTotal() }
  function stopAlarmTimer() { if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null } }

  function fmtRemain(s) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60; return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}` }

  const ringStyle = computed(() => { const circ = 2 * Math.PI * 52; const progress = alarm.total > 0 ? alarm.remain / alarm.total : 0; return { strokeDashoffset: circ * (1 - progress) } })

  function stop() { stopAlarmTimer() }

  return { alarm, openAlarm, closeAlarm, adjust, startAlarm, togglePause, resetAlarm, fmtRemain, ringStyle, stop }
}
