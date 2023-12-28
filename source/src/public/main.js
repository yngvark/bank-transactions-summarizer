/* eslint-disable no-undef */
import renderer from "./renderer.js";
import uploader from "./uploader.js";

window.d3 = d3;

function addEventListeners() {
  // Upload button
  document.getElementById('fileInput').addEventListener('change', uploader.upload);

  // Search button
  document.getElementById("search-button").addEventListener("click", renderer.filterAndRenderData);

  // Transaction search
  document.getElementById("search-term").addEventListener("keyup", renderer.filterAndRenderData);

  // Randomize button
  document.getElementById("randomize-button").addEventListener("click", renderer.randomizeAndRenderData);

  // Use AI button
  document.getElementById("use-ai").addEventListener("click", renderer.useAi);

  // Period
  document.getElementById('period-from').addEventListener('keydown', periodKeyListener);
  document.getElementById('period-to').addEventListener('keydown', periodKeyListener);
  document.getElementById("period-apply-button").addEventListener("click", renderer.filterAndRenderData);
}

function periodKeyListener(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    renderer.filterAndRenderData();
  }
}

addEventListeners();
// renderer.loadDataAndRenderTable(); // Delete, we now wait for upload to happen.
