// DOM refs cached once at load; avoids re-querying on every click.
const navButtons = document.querySelectorAll(".nav-buttons button");
const sections = document.querySelectorAll(".section");

// Single-page tab switcher: toggles `.hidden` on sections and
// `.active` on nav buttons based on data-target/id matching.
// O(n) over sections+buttons per call; fine at this scale, revisit
// if the tab count grows significantly.
function showSection(targetId) {
  localStorage.setItem("neuro-planner-active-section", targetId);

  sections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== targetId);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });
}

// Delegate-per-button click binding. data-target on each button
// maps 1:1 to a section id — add a tab by adding markup only, no
// JS changes required.
navButtons.forEach((button) => {
  button.addEventListener("click", (e) => {
    showSection(e.currentTarget.dataset.target);
  });
});

// Restore whichever section was active on the user's last visit;
// default to Home on a first-ever visit (nothing saved yet).
showSection(localStorage.getItem("neuro-planner-active-section") || "home");

// --- Task state (Checkpoint 4: in-memory array as source of truth) ---
const taskInput = document.querySelector("#task-input");
const addTaskBtn = document.querySelector("#add-task-btn");
const undoBtn = document.querySelector("#undo-btn");
const redoBtn = document.querySelector("#redo-btn");
const clearAllBtn = document.querySelector("#clear-all-btn");
const taskList = document.querySelector("#task-list");

// --- Persistence (Checkpoint 5: localStorage) ---
const STORAGE_KEY = "neuro-planner-tasks";

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Malformed/corrupted storage value — fall back to empty rather
    // than throwing and breaking the whole page on load.
    return [];
  }
}

let tasks = loadTasks();

// Action-stack based undo/redo. Each entry records enough info to
// reverse a single add or delete. A new action always clears
// redoStack — standard undo/redo convention (you can't redo past a
// fresh action). Session-only by design — not persisted.
let undoStack = [];
let redoStack = [];

function recordAction(action) {
  undoStack.push(action);
  redoStack = [];
}

// Rebuilds #task-list from `tasks` every time it's called. The DOM
// is treated as disposable output, not the source of truth — this
// function is the only place that writes to task-list's contents.
function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const taskText = document.createElement("span");

    // Checkpoint 6: simple prioritization. The oldest still-open task
    // (array index 0) is treated as "next up" and gets a visible
    // badge + highlight — not color alone, so it's still distinguishable
    // without relying on color perception.
    if (index === 0) {
      li.classList.add("next-task");
      const badge = document.createElement("span");
      badge.className = "next-task-badge";
      badge.textContent = "Up next";
      taskText.appendChild(badge);
    }

    taskText.appendChild(document.createTextNode(task));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-task-btn";
    deleteBtn.addEventListener("click", () => deleteTask(index));

    li.appendChild(taskText);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });

  clearAllBtn.disabled = tasks.length === 0;
}

function addTask() {
  const text = taskInput.value.trim();
  if (text === "") return;

  const index = tasks.length;
  tasks.push(text);
  recordAction({ type: "add", task: text, index });
  saveTasks();
  renderTasks();

  taskInput.value = "";
  taskInput.focus();
}

function deleteTask(index) {
  const [removed] = tasks.splice(index, 1);
  recordAction({ type: "delete", task: removed, index });
  saveTasks();
  renderTasks();
}

// Wipes the whole list in one action. Recorded as a single undoable
// step carrying a full snapshot of the prior list, rather than as
// N separate delete actions — undo restores everything at once.
function clearAllTasks() {
  if (tasks.length === 0) return;

  const snapshot = [...tasks];
  tasks = [];
  recordAction({ type: "clear", tasks: snapshot });
  saveTasks();
  renderTasks();
}

function undo() {
  const action = undoStack.pop();
  if (!action) return;

  if (action.type === "add") {
    tasks.splice(action.index, 1);
  } else if (action.type === "delete") {
    tasks.splice(action.index, 0, action.task);
  } else if (action.type === "clear") {
    tasks = [...action.tasks];
  }

  redoStack.push(action);
  saveTasks();
  renderTasks();
}

function redo() {
  const action = redoStack.pop();
  if (!action) return;

  if (action.type === "add") {
    tasks.splice(action.index, 0, action.task);
  } else if (action.type === "delete") {
    tasks.splice(action.index, 1);
  } else if (action.type === "clear") {
    tasks = [];
  }

  undoStack.push(action);
  saveTasks();
  renderTasks();
}

addTaskBtn.addEventListener("click", addTask);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearAllBtn.addEventListener("click", clearAllTasks);

// Allow Enter key as an alternative to clicking Add.
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

// Reflect whatever was loaded from localStorage immediately, rather
// than waiting for the first add/delete to trigger a render.
renderTasks();
