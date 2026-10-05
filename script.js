const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const historyList = document.getElementById("historyList");
const historyToggle = document.getElementById("historyToggle");
const historyPanel = document.getElementById("historyPanel");
const clearHistoryBtn = document.getElementById("clearHistory");
const themeToggle = document.getElementById("themeToggle");

let expression = "";
let justCalculated = false;
let history = JSON.parse(localStorage.getItem("novacalc-history") || "[]");

function updateDisplay() {
  expressionEl.textContent = expression || "0";

  if (!expression) {
    resultEl.textContent = "0";
    return;
  }

  const preview = calculateExpression(expression, true);
  resultEl.textContent = preview === null ? "…" : formatNumber(preview);
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
  return String(rounded);
}

function sanitizeExpression(value) {
  return value.replace(/[^0-9+\-*/().% ]/g, "");
}

function calculateExpression(input, preview = false) {
  let exp = sanitizeExpression(input).replace(/%/g, "/100");

  if (!exp || /[+\-*/.]$/.test(exp)) return preview ? null : "Error";

  try {
    // The expression is generated only from calculator buttons / supported keyboard characters.
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict"; return (${exp})`)();

    if (!Number.isFinite(value)) return preview ? null : "Error";
    return value;
  } catch {
    return preview ? null : "Error";
  }
}

function addValue(value) {
  if (justCalculated && /[0-9.]/.test(value)) {
    expression = "";
  }
  justCalculated = false;

  const lastChar = expression.slice(-1);

  if (/[+\-*/]/.test(value) && /[+\-*/]/.test(lastChar)) {
    expression = expression.slice(0, -1) + value;
  } else {
    expression += value;
  }

  updateDisplay();
}

function addDecimal() {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const currentPart = expression.split(/[+\-*/]/).pop();
  if (currentPart.includes(".")) return;

  if (!currentPart || /[+\-*/]$/.test(expression)) {
    expression += "0.";
  } else {
    expression += ".";
  }
  updateDisplay();
}

function calculate() {
  if (!expression) return;

  const value = calculateExpression(expression);
  if (value === "Error") {
    resultEl.textContent = "Error";
    return;
  }

  const formatted = formatNumber(value);
  history.unshift({ expression, result: formatted, time: Date.now() });
  history = history.slice(0, 12);
  localStorage.setItem("novacalc-history", JSON.stringify(history));

  expressionEl.textContent = expression;
  resultEl.textContent = formatted;
  expression = formatted;
  justCalculated = true;

  renderHistory();
}

function clearAll() {
  expression = "";
  justCalculated = false;
  updateDisplay();
}

function backspace() {
  if (justCalculated) {
    clearAll();
    return;
  }
  expression = expression.slice(0, -1);
  updateDisplay();
}

function percent() {
  if (!expression) return;

  const match = expression.match(/(\d*\.?\d+)$/);
  if (!match) return;

  const number = Number(match[1]) / 100;
  expression = expression.slice(0, -match[1].length) + formatNumber(number);
  updateDisplay();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<p class="empty-history">No calculations yet.</p>';
    return;
  }

  historyList.innerHTML = history
    .map(item => `
      <button class="history-item" type="button" data-expression="${item.expression.replaceAll('"', '&quot;')}">
        <div class="history-expression">${item.expression.replace(/\*/g, "×").replace(/\//g, "÷")}</div>
        <div class="history-result">= ${item.result}</div>
      </button>
    `)
    .join("");

  document.querySelectorAll(".history-item").forEach(button => {
    button.addEventListener("click", () => {
      expression = button.dataset.expression;
      justCalculated = false;
      updateDisplay();
    });
  });
}

document.querySelectorAll(".key").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    const value = button.dataset.value;

    if (action === "clear") clearAll();
    else if (action === "backspace") backspace();
    else if (action === "decimal") addDecimal();
    else if (action === "percent") percent();
    else if (action === "equals") calculate();
    else if (value) addValue(value);
  });
});

document.addEventListener("keydown", event => {
  const key = event.key;

  if (/^[0-9]$/.test(key)) addValue(key);
  else if (["+", "-", "*", "/"].includes(key)) addValue(key);
  else if (key === ".") addDecimal();
  else if (key === "%") percent();
  else if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculate();
  } else if (key === "Backspace") backspace();
  else if (key === "Escape" || key.toLowerCase() === "c") clearAll();
});

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  localStorage.removeItem("novacalc-history");
  renderHistory();
});

historyToggle.addEventListener("click", () => {
  historyPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  themeToggle.textContent = isLight ? "◐" : "☀";
  localStorage.setItem("novacalc-theme", isLight ? "light" : "dark");
});

if (localStorage.getItem("novacalc-theme") === "light") {
  document.body.classList.add("light");
  themeToggle.textContent = "◐";
}

updateDisplay();
renderHistory();
