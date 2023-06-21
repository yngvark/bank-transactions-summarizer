import renderer from "./render.js";

window.d3 = d3;

function addEventListeners() {
  // Search button
  document.getElementById("search-button").addEventListener("click", renderer.filterAndRenderData);

  // Transaction search
  document.getElementById("search-term").addEventListener("keyup", renderer.filterAndRenderData);

  // Randomize button
  document.getElementById("randomize-button").addEventListener("click", renderer.randomizeAndRenderData);

  // Period apply button
  document.getElementById("period-apply-button").addEventListener("click", renderer.filterAndRenderData);
}

addEventListeners();
renderer.loadDataAndRenderTable();
