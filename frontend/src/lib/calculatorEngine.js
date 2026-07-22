// Plain reducer, no DOM/React — a basic four-function calculator state
// machine (not a full expression parser), kept separate from the widget so
// the arithmetic can be unit-tested headlessly.

export const initialCalculatorState = {
  display: '0',
  previousValue: null,
  operator: null,
  overwrite: true,
  memory: 0,
}

// Floating point noise guard (0.1 + 0.2 === 0.30000000000000004) — round to
// 10 significant figures before displaying/storing.
function clean(n) {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 1e10) / 1e10
}

function applyOperator(a, b, op) {
  if (op === '+') return clean(a + b)
  if (op === '-') return clean(a - b)
  if (op === '×') return clean(a * b)
  if (op === '÷') return b === 0 ? NaN : clean(a / b)
  return b
}

export function calculatorReducer(state, action) {
  switch (action.type) {
    case 'digit': {
      if (state.overwrite) return { ...state, display: action.digit === '0' ? '0' : action.digit, overwrite: false }
      if (state.display === '0' && action.digit === '0') return state
      if (state.display.replace('-', '').length >= 15) return state
      return { ...state, display: state.display === '0' ? action.digit : state.display + action.digit }
    }
    case 'decimal': {
      if (state.overwrite) return { ...state, display: '0.', overwrite: false }
      if (state.display.includes('.')) return state
      return { ...state, display: `${state.display}.` }
    }
    case 'operator': {
      const current = Number(state.display)
      if (state.operator && !state.overwrite) {
        const result = applyOperator(state.previousValue, current, state.operator)
        return { ...state, display: String(result), previousValue: result, operator: action.operator, overwrite: true }
      }
      return { ...state, previousValue: current, operator: action.operator, overwrite: true }
    }
    case 'equals': {
      if (state.operator === null || state.previousValue === null) return state
      const current = Number(state.display)
      const result = applyOperator(state.previousValue, current, state.operator)
      return {
        ...state,
        display: Number.isNaN(result) ? 'Error' : String(result),
        previousValue: null,
        operator: null,
        overwrite: true,
        lastResult: { expression: `${state.previousValue} ${state.operator} ${current}`, result },
      }
    }
    case 'percent': {
      const current = Number(state.display)
      const result = state.previousValue !== null ? clean((state.previousValue * current) / 100) : clean(current / 100)
      return { ...state, display: String(result), overwrite: true }
    }
    case 'sqrt': {
      const current = Number(state.display)
      const result = current < 0 ? NaN : clean(Math.sqrt(current))
      return { ...state, display: Number.isNaN(result) ? 'Error' : String(result), overwrite: true }
    }
    case 'toggleSign':
      return { ...state, display: state.display === '0' ? state.display : String(clean(Number(state.display) * -1)) }
    case 'backspace': {
      if (state.overwrite) return state
      const next = state.display.slice(0, -1)
      return { ...state, display: next === '' || next === '-' ? '0' : next, overwrite: next === '' }
    }
    case 'clear':
      return { ...initialCalculatorState, memory: state.memory }
    case 'memoryAdd':
      return { ...state, memory: clean(state.memory + Number(state.display)), overwrite: true }
    case 'memorySubtract':
      return { ...state, memory: clean(state.memory - Number(state.display)), overwrite: true }
    case 'memoryRecall':
      return { ...state, display: String(state.memory), overwrite: false }
    case 'memoryClear':
      return { ...state, memory: 0 }
    case 'setDisplay':
      return { ...state, display: String(action.value), previousValue: null, operator: null, overwrite: false }
    default:
      return state
  }
}
