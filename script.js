// DOM refs cached once at load; avoids re-querying on every click.
const navButtons = document.querySelectorAll(".nav-buttons button");
const sections = document.querySelectorAll(".section");

// Single-page tab switcher: toggles `.hidden` on sections and
// `.active` on nav buttons based on data-target/id matching.
// O(n) over sections+buttons per call; fine at this scale, revisit
// if the tab count grows significantly.
function showSection(targetId) {
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

// Set initial active view on load.
showSection("home");

// --- Task state (Checkpoint 4: in-memory array as source of truth) ---
const taskInput = document.querySelector("#task-input");
const addTaskBtn = document.querySelector("#add-task-btn");
const undoBtn = document.querySelector("#undo-btn");
const redoBtn = document.querySelector("#redo-btn");
const taskList = document.querySelector("#task-list");
let tasks = [];

// Action-stack based undo/redo. Each entry records enough info to
// reverse a single add or delete. A new action always clears
// redoStack — standard undo/redo convention (you can't redo past a
// fresh action).
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
    taskText.textContent = task;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-task-btn";
    deleteBtn.addEventListener("click", () => deleteTask(index));

    li.appendChild(taskText);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (text === "") return;

  const index = tasks.length;
  tasks.push(text);
  recordAction({ type: "add", task: text, index });
  renderTasks();

  taskInput.value = "";
  taskInput.focus();
}

function deleteTask(index) {
  const [removed] = tasks.splice(index, 1);
  recordAction({ type: "delete", task: removed, index });
  renderTasks();
}

function undo() {
  const action = undoStack.pop();
  if (!action) return;

  if (action.type === "add") {
    tasks.splice(action.index, 1);
  } else if (action.type === "delete") {
    tasks.splice(action.index, 0, action.task);
  }

  redoStack.push(action);
  renderTasks();
}

function redo() {
  const action = redoStack.pop();
  if (!action) return;

  if (action.type === "add") {
    tasks.splice(action.index, 0, action.task);
  } else if (action.type === "delete") {
    tasks.splice(action.index, 1);
  }

  undoStack.push(action);
  renderTasks();
}

addTaskBtn.addEventListener("click", addTask);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// Allow Enter key as an alternative to clicking Add.
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});
