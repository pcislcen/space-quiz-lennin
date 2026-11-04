const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const page = readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
const questionsSource = script.match(/const questions = (\[[\s\S]*?\n      \]);/)[1];
const questions = vm.runInNewContext(`(${questionsSource})`);
const correctAnswers = questions.map(question => question.correct);
const recordKey = "orbita-personal-best";

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.attributes = {};
    this.disabled = false;
    this.hidden = false;
    this.textContent = "";
    this.className = "";
    this.classList = {
      add: (...names) => {
        this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" ");
      }
    };
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (value.includes("answer-label")) {
      this.children = [new Element(), new Element(), new Element()];
      this.children[0].className = "answer-key";
      this.children[1].className = "answer-label";
      this.children[2].className = "answer-icon";
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(selector) {
    return this.children.find(child => child.className.split(/\s+/).includes(selector.slice(1))) || null;
  }

  querySelectorAll(selector) {
    return this.children.filter(child => child.className.split(/\s+/).includes(selector.slice(1)));
  }

  replaceChildren(...children) {
    this.children = children;
  }

  append(child) {
    this.children.push(child);
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  click() {
    if (!this.disabled) this.listeners.click?.();
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  focus() {}
}

function createQuiz(storage = new Map(), { unavailable = false, writeUnavailable = false } = {}) {
  const selectors = [
    "#quiz-screen", "#result-screen", "#question", "#question-count", "#answers",
    "#score", "#progress-fill", ".progress-track", "#feedback", "#next-button",
    "#restart-button", "#personal-best", "#final-score", "#result-emoji",
    "#result-title", "#result-copy"
  ];
  const elements = new Map(selectors.map(selector => [selector, new Element()]));
  const document = {
    querySelector: selector => elements.get(selector),
    createElement: () => new Element()
  };
  const window = {};

  Object.defineProperty(window, "localStorage", {
    get() {
      if (unavailable) throw new Error("Storage unavailable");
      return {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem(key, value) {
          if (writeUnavailable) throw new Error("Storage is read-only");
          storage.set(key, String(value));
        }
      };
    }
  });

  vm.runInNewContext(script, { document, window });
  return {
    elements,
    storage,
    completeGame(score) {
      correctAnswers.forEach((correct, index) => {
        const answer = score > index ? correct : (correct + 1) % questions[index].answers.length;
        elements.get("#answers").children[answer].click();
        elements.get("#next-button").click();
      });
    }
  };
}

test("saves and shows the first personal record", () => {
  const quiz = createQuiz();
  quiz.completeGame(4);

  assert.equal(quiz.storage.get(recordKey), "4");
  assert.equal(quiz.elements.get("#personal-best").textContent, "¡Tu primer récord personal: 4 de 10!");
});

test("keeps the existing record for lower and tied scores", () => {
  const storage = new Map([[recordKey, "8"]]);
  const quiz = createQuiz(storage);
  quiz.completeGame(4);
  assert.equal(quiz.storage.get(recordKey), "8");
  assert.equal(quiz.elements.get("#personal-best").textContent, "Récord personal: 8 de 10.");

  quiz.elements.get("#restart-button").click();
  quiz.completeGame(8);
  assert.equal(quiz.storage.get(recordKey), "8");
  assert.equal(quiz.elements.get("#personal-best").textContent, "Récord personal: 8 de 10.");
});

test("replaces the record only when the score improves", () => {
  const storage = new Map([[recordKey, "5"]]);
  const quiz = createQuiz(storage);
  quiz.completeGame(7);

  assert.equal(quiz.storage.get(recordKey), "7");
  assert.equal(quiz.elements.get("#personal-best").textContent, "¡Nuevo récord personal: 7 de 10!");
});

test("loads the saved record after a page reload", () => {
  const storage = new Map();
  createQuiz(storage).completeGame(6);

  const reloadedQuiz = createQuiz(storage);
  reloadedQuiz.completeGame(3);
  assert.equal(reloadedQuiz.elements.get("#personal-best").textContent, "Récord personal: 6 de 10.");
});

test("replaces malformed stored data with the current score", () => {
  const storage = new Map([[recordKey, "not-a-score"]]);
  const quiz = createQuiz(storage);
  quiz.completeGame(2);

  assert.equal(quiz.storage.get(recordKey), "2");
  assert.equal(quiz.elements.get("#personal-best").textContent, "¡Tu primer récord personal: 2 de 10!");
});

test("continues the quiz and reports unavailable storage", async t => {
  await t.test("when storage cannot be read", () => {
    const quiz = createQuiz(new Map(), { unavailable: true });
    quiz.completeGame(5);

    assert.equal(quiz.elements.get("#personal-best").textContent, "Récord personal no disponible en este navegador.");
  });

  await t.test("when a new record cannot be saved", () => {
    const quiz = createQuiz(new Map(), { writeUnavailable: true });
    quiz.completeGame(5);

    assert.equal(quiz.elements.get("#personal-best").textContent, "Récord personal no disponible en este navegador.");
  });
});
