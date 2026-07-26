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