import { reactive } from 'vue'

// 计算器模块：支持鼠标点按 + 电脑键盘（0-9 . + - * ÷ 回车 = % Backspace C Esc）。
export function useCalc() {
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

  function bind() { window.addEventListener('keydown', onCalcKey) }
  function unbind() { window.removeEventListener('keydown', onCalcKey) }

  return { calc, openCalc, closeCalc, calcInput, calcDot, calcOp, calcEqual, calcPercent, calcNeg, calcBackspace, calcClear, bind, unbind }
}
