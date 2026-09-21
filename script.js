let QUESTIONS = [];
const el = s => document.querySelector(s), els = s => Array.from(document.querySelectorAll(s));
let order = [], idx = 0, score = 0, answersGiven = [], timer = null, remaining = 30, totalSeconds = 0;

function formatSeconds(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return (m > 0 ? m + " min " : "") + sec + " s"
}

function startQuiz() {
    idx = 0;
    score = 0;
    answersGiven = [];
    totalSeconds = 0;
    el("#screenStart").classList.add("hidden");
    el("#screenResults").classList.add("hidden");
    el("#screenQuiz").classList.remove("hidden");
    el("#btnRestartTop").classList.remove("hidden");
    showQuestion()
}

function shuffleOrder() {
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]]
    }
}

function setTimer(seconds) {
    remaining = seconds;
    el("#timeLeft").textContent = remaining;
    const bar = el("#timeBar");
    bar.style.transform = "scaleX(1)";
    const startTs = performance.now();
    clearInterval(timer);
    timer = setInterval(() => {
        const elapsed = Math.floor((performance.now() - startTs) / 1000);
        const left = Math.max(0, seconds - elapsed);
        if (left !== remaining) {
            remaining = left;
            el("#timeLeft").textContent = remaining;
            const ratio = Math.max(.001, remaining / seconds);
            bar.style.transform = `scaleX(${ratio})`
        }
        if (remaining <= 0) {
            clearInterval(timer);
            lockQuestion(null)
        }
    }, 100)
}

function showQuestion() {
    const qIndex = order[idx], q = QUESTIONS[qIndex];
    el("#progress").textContent = `Frage ${idx + 1} von ${QUESTIONS.length}`;
    el("#questionText").textContent = q.q;
    el("#questionSub").style.display = "none";
    el("#feedback").className = "feedback";
    const list = el("#answerList");
    list.innerHTML = "";
    ["a", "b", "c", "d"].forEach((lab, i) => {
        if (i >= q.a.length) return;
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.dataset.index = i;
        btn.innerHTML = `<span class="label">${String.fromCharCode(97 + i)}</span><div>${q.a[i]}</div>`;
        btn.addEventListener("click", () => lockQuestion(i));
        list.appendChild(btn)
    });
    el("#btnNext").disabled = true;
    setTimer(30)
}

function lockQuestion(pickedIndex) {
    clearInterval(timer);
    const qIndex = order[idx], q = QUESTIONS[qIndex];
    const listBtns = els("#answerList .answer-btn");
    listBtns.forEach(b => b.disabled = true);
    listBtns.forEach((b, i) => {
        if (i === q.correct) b.classList.add("correct");
        if (pickedIndex !== null && i === pickedIndex && i !== q.correct) b.classList.add("wrong")
    });
    const isCorrect = pickedIndex === q.correct;
    if (isCorrect) score++;
    const fb = el("#feedback");
    fb.classList.add("show", isCorrect ? "ok" : "bad");
    fb.innerHTML = isCorrect ? "✅ Richtig!" : `❌ Falsch. Richtig ist: <b>${String.fromCharCode(97 + q.correct)})</b> ${q.a[q.correct]}`;
    el("#btnNext").disabled = false;
    answersGiven.push({correct: isCorrect, picked: pickedIndex, correctIndex: q.correct, qIndex, time: 30 - remaining});
    totalSeconds += 30 - remaining
}

function nextQuestion() {
    if (idx < QUESTIONS.length - 1) {
        idx++;
        showQuestion()
    } else {
        showResults()
    }
}

function showResults() {
    el("#screenQuiz").classList.add("hidden");
    el("#screenResults").classList.remove("hidden");
    el("#scoreText").textContent = `Du hast ${score} von ${QUESTIONS.length} Fragen richtig beantwortet (${Math.round(score / QUESTIONS.length * 100)} %).`;
    el("#timeTotal").textContent = `Bearbeitungszeit (ohne Wartezeit): ${formatSeconds(totalSeconds)}.`;
    const tbody = el("#tableResults tbody");
    tbody.innerHTML = "";
    answersGiven.forEach((ans, i) => {
        const q = QUESTIONS[order[i]];
        const tr = document.createElement("tr");
        tr.className = ans.correct ? "correct-row" : "wrong-row";
        const your = ans.picked === null ? "—" : `${String.fromCharCode(97 + ans.picked)}) ${q.a[ans.picked]}`;
        const right = `${String.fromCharCode(97 + ans.correctIndex)}) ${q.a[ans.correctIndex]}`;
        tr.innerHTML = `<td>${i + 1}</td><td>${q.q}</td><td>${your}</td><td>${right}</td><td>${ans.correct ? '<span class="tag-ok">richtig</span>' : '<span class="tag-bad">falsch</span>'}</td>`;
        tbody.appendChild(tr)
    })
}

function restart() {
    order = QUESTIONS.map((_, i) => i);
    startQuiz()
}

function attachListeners() {
    el("#btnStart").addEventListener("click", startQuiz);
    el("#btnShuffle").addEventListener("click", () => {
        shuffleOrder();
        el("#btnShuffle").textContent = "Reihenfolge gemischt ✓"
    });
    el("#btnNext").addEventListener("click", nextQuestion);
    el("#btnRestart").addEventListener("click", restart);
    el("#btnRestartTop").addEventListener("click", restart);
    el("#btnRestartBottom").addEventListener("click", restart);
    window.addEventListener("keydown", (ev) => {
        if (!el("#screenQuiz") || el("#screenQuiz").classList.contains("hidden")) return;
        const map = {"1": 0, "2": 1, "3": 2, "a": 0, "b": 1, "c": 2};
        if (map.hasOwnProperty(ev.key)) {
            const btn = el(`#answerList .answer-btn:nth-child(${map[ev.key] + 1})`);
            if (btn && !btn.disabled) btn.click()
        }
        if (ev.key === "Enter" && !el("#btnNext").disabled) nextQuestion()
    });
}

async function loadQuestions() {
    try {
        const res = await fetch('questions.json');
        if (!res.ok) throw new Error('Failed to load questions.json');
        QUESTIONS = await res.json();
        order = QUESTIONS.map((_, i) => i);
        attachListeners();
    } catch (e) {
        console.error(e);
    }
}

loadQuestions();
