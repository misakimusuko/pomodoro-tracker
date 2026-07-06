(() => {
  const DURATIONS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

  const timerDisplay = document.getElementById("timerDisplay");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const sessionCountEl = document.getElementById("sessionCount");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");
  const taskStats = document.getElementById("taskStats");
  const clearDoneBtn = document.getElementById("clearDoneBtn");
  const dingSound = document.getElementById("dingSound");

  let mode = "work";
  let secondsLeft = DURATIONS.work;
  let timerId = null;
  let running = false;
  let sessionCount = Number(localStorage.getItem("pomo_sessionCount") || 0);
  let activeTaskId = localStorage.getItem("pomo_activeTaskId") || null;
  let tasks = JSON.parse(localStorage.getItem("pomo_tasks") || "[]");

  sessionCountEl.textContent = sessionCount;

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function updateDisplay() {
    timerDisplay.textContent = formatTime(secondsLeft);
    document.title = running ? `${formatTime(secondsLeft)} - ポモドーロ` : "ポモドーロ & タスク";
  }

  function setMode(newMode, resetTime = true) {
    mode = newMode;
    modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    document.body.classList.remove("mode-work", "mode-short", "mode-long");
    document.body.classList.add(`mode-${mode}`);
    if (resetTime) {
      secondsLeft = DURATIONS[mode];
      updateDisplay();
    }
  }

  function playDing() {
    try {
      dingSound.currentTime = 0;
      dingSound.play().catch(() => {});
    } catch (e) {}
  }

  function tick() {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(timerId);
      timerId = null;
      running = false;
      startBtn.textContent = "開始";
      playDing();

      if (mode === "work") {
        sessionCount++;
        localStorage.setItem("pomo_sessionCount", sessionCount);
        sessionCountEl.textContent = sessionCount;
        if (activeTaskId) {
          const t = tasks.find((t) => t.id === activeTaskId);
          if (t) {
            t.pomos = (t.pomos || 0) + 1;
            saveTasks();
            renderTasks();
          }
        }
        const nextMode = sessionCount % 4 === 0 ? "long" : "short";
        setMode(nextMode);
      } else {
        setMode("work");
      }
      return;
    }
    updateDisplay();
  }

  function toggleStart() {
    if (running) {
      clearInterval(timerId);
      timerId = null;
      running = false;
      startBtn.textContent = "開始";
    } else {
      running = true;
      startBtn.textContent = "一時停止";
      timerId = setInterval(tick, 1000);
    }
  }

  function reset() {
    clearInterval(timerId);
    timerId = null;
    running = false;
    startBtn.textContent = "開始";
    secondsLeft = DURATIONS[mode];
    updateDisplay();
  }

  startBtn.addEventListener("click", toggleStart);
  resetBtn.addEventListener("click", reset);

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      clearInterval(timerId);
      timerId = null;
      running = false;
      startBtn.textContent = "開始";
      setMode(btn.dataset.mode);
    });
  });

  // --- Tasks ---

  function saveTasks() {
    localStorage.setItem("pomo_tasks", JSON.stringify(tasks));
  }

  function saveActiveTask() {
    if (activeTaskId) {
      localStorage.setItem("pomo_activeTaskId", activeTaskId);
    } else {
      localStorage.removeItem("pomo_activeTaskId");
    }
  }

  function renderTasks() {
    taskList.innerHTML = "";
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "") + (task.id === activeTaskId ? " active" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      text.addEventListener("click", () => {
        activeTaskId = task.id === activeTaskId ? null : task.id;
        saveActiveTask();
        renderTasks();
      });

      const pomo = document.createElement("span");
      pomo.className = "task-pomo";
      pomo.textContent = task.pomos ? `🍅×${task.pomos}` : "";

      const del = document.createElement("button");
      del.className = "task-delete";
      del.textContent = "×";
      del.addEventListener("click", () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        if (activeTaskId === task.id) activeTaskId = null;
        saveTasks();
        saveActiveTask();
        renderTasks();
      });

      li.append(checkbox, text, pomo, del);
      taskList.appendChild(li);
    });

    const doneCount = tasks.filter((t) => t.done).length;
    taskStats.textContent = `${doneCount} / ${tasks.length} 完了`;
  }

  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = taskInput.value.trim();
    if (!value) return;
    tasks.push({ id: crypto.randomUUID(), text: value, done: false, pomos: 0 });
    taskInput.value = "";
    saveTasks();
    renderTasks();
  });

  clearDoneBtn.addEventListener("click", () => {
    tasks = tasks.filter((t) => !t.done);
    saveTasks();
    renderTasks();
  });

  setMode("work");
  updateDisplay();
  renderTasks();
})();
