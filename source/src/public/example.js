
console.log("Hello!")

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const svg = d3.select("body")
    .append("svg")
    .attr("width", 500)
    .attr("height", 500);

svg
    .append("text")
    .attr("x", 100)
    .attr("y", 100)
    .text("Hello d3js");

svg
    .append("circle")
    .attr("r", 30)
    .attr("cx", 60)
    .attr("cy", 50);
