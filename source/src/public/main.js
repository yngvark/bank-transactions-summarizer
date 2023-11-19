import renderer from "./render.js";

window.d3 = d3;

function addEventListeners() {
  // Search button
  document.getElementById("search-button").addEventListener("click", renderer.filterAndRenderData);

  // Transaction search
  document.getElementById("search-term").addEventListener("keyup", renderer.filterAndRenderData);

  // Randomize button
  document.getElementById("randomize-button").addEventListener("click", renderer.randomizeAndRenderData);

  // Use AI button
  document.getElementById("use-ai").addEventListener("click", renderer.useAi);

  // Period apply button
  document.getElementById("period-apply-button").addEventListener("click", renderer.filterAndRenderData);

  document.getElementById('period-from').addEventListener('keydown', periodKeyListener);
  document.getElementById('period-to').addEventListener('keydown', periodKeyListener);
}

function periodKeyListener(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    renderer.filterAndRenderData();
  }
}


addEventListeners();
renderer.loadDataAndRenderTable();
