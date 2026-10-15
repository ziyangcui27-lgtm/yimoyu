import { ref } from 'vue'

// 网速模块：从 Cloudflare 下载 1MB 实测实时带宽。start() 每秒采样，stop() 停止。
export function useSpeed() {
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

  function start() {
    stop()
    sampleSpeed()
    speedTimer = setInterval(sampleSpeed, 1000)
  }

  function stop() {
    if (speedTimer) { clearInterval(speedTimer); speedTimer = null }
  }

  return { speedResult, sampling, start, stop }
}
