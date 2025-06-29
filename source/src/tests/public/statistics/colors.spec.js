import statistics from "../../../public/statistics/statistics.js";
import parser from "../../../public/statistics/parser.js";
import renderer from "../../../public/renderer.js";

import * as d3 from "../../d3-7.8.4.js";

const fs = require("fs");
import path from "path";

describe("color calculations", () => {
  test("should calculate correct colors for spending patterns", async () => {
    // Given
    const categoriesFile = "../../../routes/categories/categories.json"
    const categoryMapping = JSON.parse(fs.readFileSync(path.join(__dirname, categoriesFile), "utf8"));

    const csvFile = "test.csv";
    const data = fs.readFileSync(path.join(__dirname, csvFile), "utf8");
    const transactions = d3.csvParse(data);
    const transactionsWithCategory = await parser.parse(categoryMapping, transactions);

    // When
    const result = await statistics.calculate(d3, transactionsWithCategory);

    // Then - check that we get raw data for color calculations
    expect(result.rawTableData).toBeDefined();
    expect(result.rawTableData.length).toBeGreaterThan(0);
    
    // Test color calculations
    const firstCategory = result.rawTableData[0];
    console.log("First category data:", firstCategory);
    
    // Test individual color calculation
    const average = firstCategory.average;
    
    // Test case 1: Value equal to average should be white/neutral
    const neutralColor = renderer.calculateColorForTesting(average, average);
    expect(neutralColor).toBe('#ffffff');
    
    // Test case 2: Value double the average should be maximum red
    const maxRedColor = renderer.calculateColorForTesting(average * 2, average);
    expect(maxRedColor).toBe('#ff4444');
    
    // Test case 3: Value half the average should be maximum green
    const maxGreenColor = renderer.calculateColorForTesting(average * 0.5, average);
    expect(maxGreenColor).toBe('#44ff44');
    
    // Test case 4: Value between average and double should be light red
    const lightRedColor = renderer.calculateColorForTesting(average * 1.5, average);
    expect(lightRedColor).not.toBe('#ffffff');
    expect(lightRedColor).not.toBe('#ff4444');
    console.log("Light red color for 1.5x average:", lightRedColor);
    
    // Test case 5: Value between half and average should be light green
    const lightGreenColor = renderer.calculateColorForTesting(average * 0.75, average);
    expect(lightGreenColor).not.toBe('#ffffff');
    expect(lightGreenColor).not.toBe('#44ff44');
    console.log("Light green color for 0.75x average:", lightGreenColor);
  });

  test("should generate color data for all table cells", async () => {
    // Given
    const categoriesFile = "../../../routes/categories/categories.json"
    const categoryMapping = JSON.parse(fs.readFileSync(path.join(__dirname, categoriesFile), "utf8"));

    const csvFile = "test.csv";
    const data = fs.readFileSync(path.join(__dirname, csvFile), "utf8");
    const transactions = d3.csvParse(data);
    const transactionsWithCategory = await parser.parse(categoryMapping, transactions);
    const result = await statistics.calculate(d3, transactionsWithCategory);

    // Simulate what happens in renderTable by creating color data
    const colorData = [];
    result.rawTableData.forEach((rawRow, rowIndex) => {
      const rowColors = [];
      // Category column - neutral
      rowColors.push('#ffffff');
      
      // Period columns - calculate colors
      rawRow.periodTotals.forEach(cellValue => {
        const color = renderer.calculateColorForTesting(cellValue, rawRow.average);
        rowColors.push(color);
      });
      
      // Sum and Average columns - neutral
      rowColors.push('#ffffff');
      rowColors.push('#ffffff');
      
      colorData.push(rowColors);
    });

    // Then
    expect(colorData.length).toBe(result.rawTableData.length);
    
    // Each row should have colors for all columns
    colorData.forEach((rowColors, rowIndex) => {
      const expectedColumnCount = 1 + result.yearMonths.length + 2; // Category + periods + Sum + Average
      expect(rowColors.length).toBe(expectedColumnCount);
      
      // Log color data for visual inspection
      console.log(`Row ${rowIndex} (${result.rawTableData[rowIndex].category}):`);
      console.log(`  Average: ${result.rawTableData[rowIndex].average}`);
      console.log(`  Values: ${result.rawTableData[rowIndex].periodTotals}`);
      console.log(`  Colors: ${rowColors.slice(1, -2)}`); // Skip category, sum, average columns
    });
  });
});