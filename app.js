
(() => {
  "use strict";

  let DATA = [];
  let pool = [];
  let idx = 0;
  let score = 0;
  let answered = 0;
  let wrong = [];
  let current = null;

  const $ = id => document.getElementById(id);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function start() {
    const y = $("year").value;
    const c = $("count").value;

    pool = DATA.filter(q => y === "all" || String(q.year) === y);
    pool = shuffle(pool.slice());

    if (c !== "all") {
      pool = pool.slice(0, Math.min(Number(c), pool.length));
    }

    if (!pool.length) return;

    idx = 0;
    score = 0;
    answered = 0;
    wrong = [];

    $("setup").classList.add("hidden");
    $("result").classList.add("hidden");
    $("wrong").classList.add("hidden");
    $("quiz").classList.remove("hidden");

    render();
  }

  function render() {
    current = pool[idx];

    $("meta").textContent = `Rok ${current.year} • pytanie ${current.n}`;
    $("q").textContent = current.q;
    $("pos").textContent = `${idx + 1} / ${pool.length}`;
    $("bar").style.width = `${(idx / pool.length) * 100}%`;
    $("answered").textContent = `Odpowiedzi: ${answered}`;
    $("score").textContent = `Wynik: ${score}`;

    const box = $("opts");
    box.innerHTML = "";

    ["A", "B", "C"].forEach((letter, i) => {
      const button = document.createElement("button");
      button.className = "opt";
      button.type = "button";
      button.textContent = `${letter}. ${current.options[i]}`;
      button.addEventListener("click", () => answer(i, letter, button), {once: true});
      box.appendChild(button);
    });

    $("feedback").classList.add("hidden");
    $("next").classList.add("hidden");
  }

  function answer(i, letter, button) {
    document.querySelectorAll(".opt").forEach(x => x.disabled = true);

    answered++;

    const known = !!current.answer;

    if (known && letter === current.answer) {
      score++;
      button.classList.add("correct");
      $("feedback").innerHTML =
        `<div class="basis"><b>✓ Prawidłowa odpowiedź.</b>` +
        (current.basis ? `<br><b>Podstawa:</b> ${htmlEscape(current.basis)}` : "") +
        `</div>`;
    } else {
      button.classList.add("wrong");

      if (known) {
        document.querySelectorAll(".opt").forEach((x, j) => {
          if (["A", "B", "C"][j] === current.answer) {
            x.classList.add("correct");
          }
        });
        wrong.push(current);
        localStorage.setItem("wrongQuestions", JSON.stringify(wrong));
      }

      $("feedback").innerHTML =
        `<div class="basis"><b>${known ? "✗ Nieprawidłowa odpowiedź." : "⚠ Brak zweryfikowanego klucza dla tego pytania."}</b>` +
        (current.basis
          ? `<br><b>Prawidłowa:</b> ${current.answer}<br><b>Podstawa:</b> ${htmlEscape(current.basis)}`
          : "") +
        `</div>`;
    }

    $("feedback").classList.remove("hidden");
    $("next").classList.remove("hidden");
    $("score").textContent = `Wynik: ${score}`;
    $("answered").textContent = `Odpowiedzi: ${answered}`;
  }

  function nextQ() {
    idx++;
    if (idx >= pool.length) finish();
    else render();
  }

  function finish() {
    $("quiz").classList.add("hidden");
    $("result").classList.remove("hidden");

    const verified = pool.filter(q => q.answer).length;

    $("result").innerHTML =
      `<h2>Koniec testu</h2>` +
      `<p><b>Wynik: ${score}</b> / ${verified} zweryfikowanych pytań</p>` +
      `<p>Błędy: ${wrong.length}</p>` +
      `<div class="grid">` +
      `<button type="button" id="againBtn">Jeszcze raz</button>` +
      `<button type="button" class="secondary" id="repeatFromResultBtn">Powtórz błędy</button>` +
      `</div>`;

    $("againBtn").addEventListener("click", start);
    $("repeatFromResultBtn").addEventListener("click", repeatWrong);
  }

  function quit() {
    $("quiz").classList.add("hidden");
    $("result").classList.add("hidden");
    $("setup").classList.remove("hidden");
  }

  function restartCurrent() {
    pool = shuffle(pool.slice());
    idx = 0;
    score = 0;
    answered = 0;
    wrong = [];
    render();
  }

  function showWrong() {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("wrongQuestions") || "[]");
    } catch (_) {}

    const list = wrong.length ? wrong : saved;

    $("setup").classList.add("hidden");
    $("quiz").classList.add("hidden");
    $("result").classList.add("hidden");
    $("wrong").classList.remove("hidden");

    $("wrong").innerHTML =
      `<h2>Moje błędy</h2>` +
      (list.length
        ? `<p>Ostatnie błędne pytania: ${list.length}</p>` +
          `<button type="button" id="repeatWrongBtn">Rozwiąż błędy ponownie</button>` +
          `<ol>${list.map(x => `<li><b>${x.year}/${x.n}</b> – ${htmlEscape(x.q)}</li>`).join("")}</ol>`
        : `<p>Brak zapisanych błędów.</p>`) +
      `<br><button type="button" class="secondary" id="backBtn">Wróć</button>`;

    if (list.length) $("repeatWrongBtn").addEventListener("click", repeatWrong);
    $("backBtn").addEventListener("click", () => location.reload());
  }

  function repeatWrong() {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("wrongQuestions") || "[]");
    } catch (_) {}

    const source = wrong.length ? wrong : saved;
    if (!source.length) return;

    pool = shuffle(source.slice());
    idx = 0;
    score = 0;
    answered = 0;
    wrong = [];

    $("wrong").classList.add("hidden");
    $("quiz").classList.remove("hidden");
    render();
  }

  function htmlEscape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function init() {
    try {
      const response = await fetch("./questions.json", {cache: "no-store"});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      DATA = await response.json();

      $("startBtn").addEventListener("click", start);
      $("wrongBtn").addEventListener("click", showWrong);
      $("next").addEventListener("click", nextQ);
      $("quitBtn").addEventListener("click", quit);
      $("restartBtn").addEventListener("click", restartCurrent);

      $("loading").classList.add("hidden");
      $("setup").classList.remove("hidden");
    } catch (error) {
      console.error(error);
      $("loading").innerHTML =
        `<h2>Nie udało się uruchomić quizu</h2>` +
        `<p>Odśwież stronę. Jeśli problem pozostanie, sprawdź czy plik <b>questions.json</b> znajduje się obok index.html.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
