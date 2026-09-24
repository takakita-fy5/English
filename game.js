(() => {
  "use strict";

  let words = [];
  let questions = [];
  let index = 0;
  let score = 0;
  let correct = 0;
  let combo = 0;
  let maxCombo = 0;
  let answered = false;
  let ready = false;

  const $ = (id) => document.getElementById(id);
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function setError(message) {
    $("err").textContent = message || "";
  }

  function normalizeData(raw) {
    let list;
    if (Array.isArray(raw)) list = raw;
    else if (raw && Array.isArray(raw.words)) list = raw.words;
    else if (raw && Array.isArray(raw.data)) list = raw.data;
    else if (raw && typeof raw === "object") list = Object.values(raw);
    else list = [];

    return list.map((v) => ({
      id: Number(v.id),
      word: String(v.word ?? "").trim(),
      meaning: String(v.meaning ?? "").trim(),
      example: String(v.example ?? "").trim(),
      example_jp: String(v.example_jp ?? "").trim()
    })).filter((v) => Number.isFinite(v.id) && v.id > 0 && v.word && v.meaning)
      .sort((a, b) => a.id - b.id);
  }

  async function loadData() {
    const button = $("startBtn");
    try {
      const response = await fetch("./data/TARGET_GAME.json?v=2", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      words = normalizeData(raw);
      if (words.length < 4) throw new Error("単語データが4語未満です");

      const maxId = words[words.length - 1].id;
      $("from").max = String(maxId);
      $("to").max = String(maxId);
      $("to").value = String(maxId);
      $("info").textContent = `${words.length}語を読み込みました（ID 1〜${maxId}）`;
      button.disabled = false;
      button.textContent = "ゲームスタート！";
      ready = true;
      setError("");
    } catch (error) {
      console.error("English Quest data load error:", error);
      button.disabled = true;
      button.textContent = "データ読み込みエラー";
      $("info").textContent = "単語データを読み込めませんでした。";
      setError("ページを再読み込みしても直らない場合は、dataフォルダとTARGET_GAME.jsonの場所を確認してください。");
    }
  }

  function makeQuestions(pool, count, mode) {
    return shuffle(pool).slice(0, count).map((item) => {
      const direction = mode === "mixed" ? (Math.random() < 0.5 ? "en-ja" : "ja-en") : mode;
      const answer = direction === "en-ja" ? item.meaning : item.word;
      const candidates = [...new Set(
        pool.filter((x) => x.id !== item.id)
          .map((x) => direction === "en-ja" ? x.meaning : x.word)
          .filter(Boolean)
      )];
      const choices = shuffle([answer, ...shuffle(candidates).slice(0, 3)]);
      return { item, direction, answer, choices };
    });
  }

  function startGame() {
    if (!ready) return;

    const from = Number($("from").value);
    const to = Number($("to").value);
    const count = Number($("count").value);
    const mode = $("mode").value;
    const pool = words.filter((x) => x.id >= from && x.id <= to);

    setError("");
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
      setError("出題範囲を正しく入力してください。");
      return;
    }
    if (pool.length < 4) {
      setError("4語以上ある範囲を選んでください。");
      return;
    }

    questions = makeQuestions(pool, Math.min(count, pool.length), mode);
    index = 0;
    score = 0;
    correct = 0;
    combo = 0;
    maxCombo = 0;

    $("start").classList.add("hidden");
    $("result").classList.add("hidden");
    $("game").classList.remove("hidden");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const q = questions[index];
    if (!q) return;

    $("qnum").textContent = `Q ${index + 1} / ${questions.length}`;
    $("bar").style.width = `${((index) / questions.length) * 100}%`;
    $("score").textContent = String(score);
    $("combo").textContent = `🔥 COMBO ×${combo}`;
    $("type").textContent = q.direction === "en-ja" ? "英語 → 日本語" : "日本語 → 英語";
    $("question").textContent = q.direction === "en-ja" ? q.item.word : q.item.meaning;
    $("example").classList.add("hidden");
    $("feedback").textContent = "";
    $("feedback").className = "";
    $("next").classList.add("hidden");

    const choices = $("choices");
    choices.innerHTML = "";
    q.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = choice;
      button.addEventListener("click", () => answerQuestion(choice, button));
      choices.appendChild(button);
    });
  }

  function answerQuestion(selected, selectedButton) {
    if (answered) return;
    answered = true;

    const q = questions[index];
    const buttons = [...document.querySelectorAll(".choice")];
    const isCorrect = selected === q.answer;
    buttons.forEach((button) => { button.disabled = true; });

    if (isCorrect) {
      correct += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      const gain = Math.min(500, 100 + (combo - 1) * 25);
      score += gain;
      selectedButton.classList.add("correct");
      $("feedback").className = "ok";
      $("feedback").textContent = `⭕ 正解！ +${gain}点`;
    } else {
      combo = 0;
      selectedButton.classList.add("wrong");
      const correctButton = buttons.find((button) => button.textContent === q.answer);
      if (correctButton) correctButton.classList.add("correct");
      $("feedback").className = "ng";
      $("feedback").textContent = `❌ 不正解　正解：${q.answer}`;
    }

    $("score").textContent = String(score);
    $("combo").textContent = `🔥 COMBO ×${combo}`;

    if (q.item.example) {
      $("example").textContent = `例文：${q.item.example}${q.item.example_jp ? ` / ${q.item.example_jp}` : ""}`;
      $("example").classList.remove("hidden");
    }

    $("next").textContent = index === questions.length - 1 ? "結果を見る" : "次の問題へ";
    $("next").classList.remove("hidden");
  }

  function nextQuestion() {
    if (index < questions.length - 1) {
      index += 1;
      renderQuestion();
    } else {
      showResult();
    }
  }

  function showResult() {
    $("game").classList.add("hidden");
    $("result").classList.remove("hidden");
    $("finalScore").textContent = String(score);
    $("correct").textContent = String(correct);
    $("total").textContent = String(questions.length);
    $("accuracy").textContent = `${Math.round((correct / questions.length) * 100)}%`;
    $("maxCombo").textContent = String(maxCombo);

    const rate = correct / questions.length;
    $("message").textContent = rate === 1 ? "🎉 パーフェクト！" : rate >= 0.8 ? "🔥 かなり仕上がってる！" : rate >= 0.6 ? "👍 いい感じ！" : rate >= 0.4 ? "💪 もう一回！" : "📚 復習して再挑戦！";
  }

  function backToStart() {
    $("result").classList.add("hidden");
    $("game").classList.add("hidden");
    $("start").classList.remove("hidden");
  }

  function init() {
    $("startBtn").addEventListener("click", startGame);
    $("next").addEventListener("click", nextQuestion);
    $("again").addEventListener("click", backToStart);
    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
