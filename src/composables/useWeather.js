import { ref, computed } from 'vue'

// 天气模块：当前天气 + 空气质量（武汉，open-meteo 开放数据）。
const WMO = { 0: '晴', 1: '大致晴朗', 2: '多云', 3: '阴天', 45: '有雾', 48: '雾凇', 51: '毛毛雨', 53: '小雨', 55: '细雨', 61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪', 75: '大雪', 80: '阵雨', 81: '强阵雨', 82: '暴雨', 95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴' }
const WMO_ICON = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️' }

export function useWeather() {
  const weather = ref(null)
  const weatherErr = ref('')
  const weatherText = ref('')

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

  return { weather, weatherErr, weatherText, weatherIcon, loadWeather, aqi, aqiInfo, aqiComputed, loadAQI }
}
