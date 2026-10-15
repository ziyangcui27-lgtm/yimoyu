// 共享音频单例：供数字人语音（开始说话/发送）与闹钟铃声共同使用的 WebAudio 上下文。
// 用模块级变量保证全局只有一个 AudioContext。
let audioCtx = null

// 确保音频上下文存在且处于运行态（浏览器需要用户手势后才能启动）
export function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
}

// 播放一段由四个音高组成的提示音，默认循环 3 轮
export function playAlarmSound(times = 3) {
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
