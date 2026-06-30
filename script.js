// ============================================================
// Basic Calculator - script.js
// Handles input building, evaluation, keyboard support,
// history tracking, and theme toggling.
// ============================================================

// ---- DOM references ----
const expressionEl = document.getElementById('expression');
const currentEl = document.getElementById('current');
const buttons = document.querySelectorAll('.btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

// ---- Calculator state ----
// expression: the full string of numbers/operators built so far (display symbols, e.g. "12×3")
// resetOnNextInput: true right after "=" so the next number typed starts fresh
let expression = '';
let resetOnNextInput = false;
let history = [];

// Map of display symbols -> actual JS operators used during evaluation
const OPERATOR_MAP = {
  '×': '*',
  '÷': '/',
  '−': '-',
  '-': '-',
  '+': '+'
};

const OPERATORS = ['+', '-', '×', '÷'];

// ============================================================
// Display update
// ============================================================
function updateDisplay() {
  currentEl.classList.remove('error');

  if (expression === '') {
    currentEl.textContent = '0';
    expressionEl.textContent = '';
    return;
  }

  currentEl.textContent = expression;
  expressionEl.textContent = '';
}

// Show an error message (e.g. division by zero) on the display
function showError(message) {
  currentEl.textContent = message;
  currentEl.classList.add('error');
  expressionEl.textContent = expression;
  expression = '';
  resetOnNextInput = true;
}

// ============================================================
// Input handlers
// ============================================================

// Append a digit or decimal point to the expression
function appendNumber(value) {
  // Start fresh if we just pressed "=" and now type a number
  if (resetOnNextInput) {
    expression = '';
    resetOnNextInput = false;
  }

  // Prevent multiple decimal points in the current number segment
  if (value === '.') {
    const lastNumber = getLastNumberSegment();
    if (lastNumber.includes('.')) return; // already has a decimal
    if (lastNumber === '') value = '0.';   // allow ".5" -> "0.5"
  }

  // Prevent leading zeros like "00" (but allow "0." for decimals)
  if (value !== '.' && expression === '0') {
    expression = value;
    updateDisplay();
    return;
  }

  expression += value;
  updateDisplay();
}

// Returns the number segment currently being typed (after the last operator)
function getLastNumberSegment() {
  const parts = expression.split(/[+\-×÷]/);
  return parts[parts.length - 1];
}

// Append an operator, replacing the previous one if the user changes their mind
function appendOperator(op) {
  if (expression === '' && op !== '-') return; // can't start with × ÷ + (allow leading minus)

  resetOnNextInput = false;

  const lastChar = expression.slice(-1);

  if (OPERATORS.includes(lastChar)) {
    // Replace the trailing operator with the new one
    expression = expression.slice(0, -1) + op;
  } else if (expression === '') {
    expression = '-'; // allow negative numbers to start the expression
  } else {
    expression += op;
  }

  updateDisplay();
}

// Remove the last character (backspace)
function backspace() {
  if (resetOnNextInput) {
    expression = '';
    resetOnNextInput = false;
  }
  expression = expression.slice(0, -1);
  updateDisplay();
}

// Clear everything
function clearAll() {
  expression = '';
  resetOnNextInput = false;
  updateDisplay();
}

// Convert the trailing number to a percentage (divide by 100)
function applyPercent() {
  const lastNumber = getLastNumberSegment();
  if (lastNumber === '') return;

  const percentValue = (parseFloat(lastNumber) / 100).toString();
  expression = expression.slice(0, expression.length - lastNumber.length) + percentValue;
  updateDisplay();
}

// ============================================================
// Evaluation
// ============================================================
function calculate() {
  if (expression === '') return;

  // Don't evaluate if expression ends with an operator
  const lastChar = expression.slice(-1);
  if (OPERATORS.includes(lastChar)) return;

  // Build a safe expression string using real JS operators
  let safeExpr = expression;
  for (const [symbol, jsOp] of Object.entries(OPERATOR_MAP)) {
    safeExpr = safeExpr.split(symbol).join(jsOp);
  }

  // Validate: only digits, operators, decimal points and parentheses allowed
  if (!/^[0-9+\-*/.\s]+$/.test(safeExpr)) {
    showError('Invalid input');
    return;
  }

  try {
    // Using Function constructor as a safer alternative to eval(),
    // restricted to arithmetic characters validated above.
    const result = Function('"use strict"; return (' + safeExpr + ')')();

    if (!isFinite(result)) {
      showError('Cannot divide by 0');
      return;
    }
    if (isNaN(result)) {
      showError('Invalid expression');
      return;
    }

    // Round to avoid floating point artifacts, keep up to 10 sig figs
    const rounded = Math.round((result + Number.EPSILON) * 1e10) / 1e10;

    addToHistory(expression, rounded);

    expression = rounded.toString();
    resetOnNextInput = true;
    updateDisplay();
  } catch (err) {
    showError('Invalid expression');
  }
}

// ============================================================
// History
// ============================================================
function addToHistory(expr, result) {
  history.unshift({ expr, result });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
    return;
  }

  historyList.innerHTML = history.map(item => `
    <li data-result="${item.result}">
      <span class="h-expr">${item.expr} =</span>
      <span class="h-result">${item.result}</span>
    </li>
  `).join('');
}

// Clicking a history entry loads its result back into the calculator
historyList.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-result]');
  if (!li) return;
  expression = li.dataset.result;
  resetOnNextInput = false;
  updateDisplay();
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  renderHistory();
});

// ============================================================
// Button click handling (event delegation)
// ============================================================
buttons.forEach(btn => {
  btn.addEventListener('click', () => handleButton(btn));
});

function handleButton(btn) {
  // Tiny visual "pressed" animation on click
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 120);

  const action = btn.dataset.action;
  const value = btn.dataset.value;

  if (action === 'clear') {
    clearAll();
  } else if (action === 'backspace') {
    backspace();
  } else if (action === 'percent') {
    applyPercent();
  } else if (action === 'operator') {
    appendOperator(value);
  } else if (action === 'equals') {
    calculate();
  } else {
    // plain number or decimal point
    appendNumber(value);
  }
}

// ============================================================
// Keyboard support
// ============================================================
window.addEventListener('keydown', (e) => {
  const key = e.key;

  if (/^[0-9]$/.test(key)) {
    appendNumber(key);
    flashButton(`.number[data-value="${key}"]`);
  } else if (key === '.') {
    appendNumber('.');
    flashButton('.number[data-value="."]');
  } else if (key === '+' || key === '-') {
    appendOperator(key);
    flashButton(`.operator[data-value="${key === '-' ? '-' : '+'}"]`);
  } else if (key === '*') {
    appendOperator('×');
    flashButton('.operator[data-value="×"]');
  } else if (key === '/') {
    e.preventDefault(); // avoid browser quick-find
    appendOperator('÷');
    flashButton('.operator[data-value="÷"]');
  } else if (key === 'Enter' || key === '=') {
    e.preventDefault();
    calculate();
    flashButton('.equals');
  } else if (key === 'Backspace') {
    backspace();
    flashButton('[data-action="backspace"]');
  } else if (key === 'Escape') {
    clearAll();
    flashButton('[data-action="clear"]');
  } else if (key === '%') {
    applyPercent();
    flashButton('[data-action="percent"]');
  }
});

// Briefly highlight the on-screen button matching a keyboard press
function flashButton(selector) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 120);
}

// ============================================================
// Theme toggle (Dark / Light mode) with localStorage persistence
// ============================================================
function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('calc-theme', theme);
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
});

// Initialize theme from saved preference or system setting
(function initTheme() {
  const saved = localStorage.getItem('calc-theme');
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
})();

// ============================================================
// Initial render
// ============================================================
updateDisplay();
renderHistory();
