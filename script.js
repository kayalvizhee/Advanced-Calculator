
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const keypad = document.getElementById("keypad");
const scientificKeys = document.getElementById("scientificKeys");
const converterPanel = document.getElementById("converterPanel");

let expression = "";
let justCalculated = false;
let currentMode = "standard";

function formatNumber(number) {
  if (!Number.isFinite(number)) throw new Error("Invalid result");
  return String(Number(number.toPrecision(12)));
}

// Safe arithmetic parser: no eval() or Function()
function calculate(source) {
  const tokens = source.match(
    /(?:\d+(?:\.\d*)?|\.\d+)|(?:sin|cos|tan|sqrt|log|ln|pi|e)|[()+\-*/^%]/gi
  );

  if (!tokens || tokens.join("") !== source.replace(/\s/g, "")) {
    throw new Error("Invalid expression");
  }

  let position = 0;

  function peek() {
    return tokens[position];
  }

  function take() {
    return tokens[position++];
  }

  function primary() {
    const token = take();
    if (token === undefined) throw new Error("Incomplete expression");

    if (token === "+") return unary();
    if (token === "-") return -unary();

    if (token === "(") {
      const value = addSub();
      if (take() !== ")") throw new Error("Missing closing bracket");
      return value;
    }

    const name = token.toLowerCase();

    if (name === "pi") return Math.PI;
    if (name === "e") return Math.E;

    if (/^(sin|cos|tan|sqrt|log|ln)$/i.test(name)) {
      if (take() !== "(") throw new Error("Function needs parentheses");

      const value = addSub();
      if (take() !== ")") throw new Error("Missing closing bracket");

      let answer;

      switch (name) {
        case "sin": answer = Math.sin(value * Math.PI / 180); break;
        case "cos": answer = Math.cos(value * Math.PI / 180); break;
        case "tan": answer = Math.tan(value * Math.PI / 180); break;
        case "sqrt": answer = Math.sqrt(value); break;
        case "log": answer = Math.log10(value); break;
        case "ln": answer = Math.log(value); break;
      }

      if (Number.isNaN(answer)) throw new Error("Invalid function input");
      return answer;
    }

    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      return Number(token);
    }

    throw new Error("Invalid input");
  }

  function power() {
    let value = primary();

    if (peek() === "^") {
      take();
      value = Math.pow(value, unary());
    }

    while (peek() === "%") {
      take();
      value /= 100;
    }

    return value;
  }

  function unary() {
    return power();
  }

  function multiplyDivide() {
    let value = unary();

    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const next = unary();

      if (operator === "/" && next === 0) {
        throw new Error("Cannot divide by zero");
      }

      value = operator === "*" ? value * next : value / next;
    }

    return value;
  }

  function addSub() {
    let value = multiplyDivide();

    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const next = multiplyDivide();
      value = operator === "+" ? value + next : value - next;
    }

    return value;
  }

  const answer = addSub();

  if (position !== tokens.length) {
    throw new Error("Invalid expression");
  }

  if (!Number.isFinite(answer)) throw new Error("Invalid result");
  return answer;
}

function updateDisplay() {
  expressionDisplay.textContent = expression || "Ready to calculate";

  if (!expression) {
    resultDisplay.textContent = "0";
    return;
  }

  try {
    resultDisplay.textContent = formatNumber(calculate(expression));
  } catch {
    resultDisplay.textContent = "…";
  }
}

function appendValue(value) {
  const startsNew = /^[0-9.]$/.test(value);

  if (justCalculated && startsNew) {
    expression = "";
  }

  justCalculated = false;
  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = "";
  justCalculated = false;
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  justCalculated = false;
  updateDisplay();
}

function calculateResult() {
  if (!expression) return;

  try {
    const answer = calculate(expression);
    expressionDisplay.textContent = expression + " =";
    expression = formatNumber(answer);
    resultDisplay.textContent = expression;
    justCalculated = true;
  } catch (error) {
    resultDisplay.textContent = error.message === "Cannot divide by zero"
      ? "Cannot divide by zero"
      : "Invalid expression";
    justCalculated = false;
  }
}

function toggleSign() {
  if (!expression) {
    expression = "-";
  } else if (justCalculated) {
    expression = `-(${expression})`;
  } else {
    expression = `-(${expression})`;
  }

  justCalculated = false;
  updateDisplay();
}

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.value !== undefined) {
    appendValue(button.dataset.value);
    return;
  }

  switch (button.dataset.action) {
    case "clear":
      clearAll();
      break;
    case "backspace":
      backspace();
      break;
    case "sign":
      toggleSign();
      break;
    case "calculate":
      calculateResult();
      break;
  }
});

// Scientific keypad
scientificKeys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const value = button.dataset.value;

  if (value === "^2") {
    appendValue("^2");
  } else {
    appendValue(value);
  }
});

// Modes
document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    currentMode = button.dataset.mode;

    document.querySelectorAll(".mode").forEach((modeButton) => {
      modeButton.classList.toggle("active", modeButton === button);
    });

    const isConverter = currentMode === "converter";

    converterPanel.classList.toggle("hidden", !isConverter);
    keypad.classList.toggle("hidden", isConverter);
    scientificKeys.classList.toggle(
      "hidden",
      currentMode !== "scientific"
    );

    if (currentMode === "percentage") {
      if (expression) {
        try {
          expression = formatNumber(calculate(expression) / 100);
          justCalculated = true;
          updateDisplay();
        } catch {
          resultDisplay.textContent = "Enter a valid number";
        }
      }
    }
  });
});

// Keyboard support
document.addEventListener("keydown", (event) => {
  if (currentMode === "converter") return;

  if (/^[0-9.]$/.test(event.key)) {
    appendValue(event.key);
  } else if (["+", "-", "*", "/", "(", ")", "%", "^"].includes(event.key)) {
    appendValue(event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculateResult();
  } else if (event.key === "Backspace") {
    backspace();
  } else if (event.key === "Escape") {
    clearAll();
  }
});

// Length converter
const unitsInMeters = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mi: 1609.344,
  ft: 0.3048
};

document.getElementById("convertButton").addEventListener("click", () => {
  const value = Number(document.getElementById("lengthValue").value);
  const from = document.getElementById("fromUnit").value;
  const to = document.getElementById("toUnit").value;
  const output = document.getElementById("convertResult");

  if (document.getElementById("lengthValue").value.trim() === "" ||
      !Number.isFinite(value)) {
    output.textContent = "Please enter a valid number.";
    return;
  }

  const converted = value * unitsInMeters[from] / unitsInMeters[to];
  output.textContent = `${formatNumber(value)} ${from} = ${formatNumber(converted)} ${to}`;
});

updateDisplay();
