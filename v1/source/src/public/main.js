/* eslint-disable no-undef */
import renderer from "./renderer.js";
import uploader from "./uploader.js";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

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

async function periodKeyListener(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    await renderer.filterAndRenderData();
  }
}

async function checkAndLoadDefaultFile() {
  try {
    const response = await fetch('/files/check');
    const result = await response.json();

    if (result.hasDataDir && result.hasDefaultFile) {
      console.log('Loading default transactions.xlsx from DATA_DIR');
      await loadDefaultFile();
    }
  } catch (error) {
    console.log('No default file available or error checking:', error);
  }
}

async function loadDefaultFile() {
  try {
    const response = await fetch('/files/default');
    if (!response.ok) {
      throw new Error('Failed to load default file');
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const transactions = XLSX.utils.sheet_to_json(worksheet);

    await renderer.loadDataAndRenderTable(transactions);
    updateCurrentFileName('transactions.xlsx');
    console.log('Default file loaded successfully');
  } catch (error) {
    console.error('Error loading default file:', error);
  }
}

function updateCurrentFileName(fileName) {
  const fileNameElement = document.getElementById('currentFileName');
  if (fileNameElement) {
    fileNameElement.textContent = fileName;
  }
}

addEventListeners();
checkAndLoadDefaultFile();
