import { DEM, REP } from "./ElectionMap.js";

export const Legend = () => {
  let countyGeo;
  let nodes;
  let votesPerMarker;
  let legendPosition;
  let fontSize;
  let lp = 2;
  let yp;
  let markerRadius;

  const legend = (selection) => {
    selection.each(() => {
      const v = selection.attr("viewBox").split(",");
      v.forEach((n, i) => (v[i] = +n));

      let x;
      let y;

      if (legendPosition === "lower-left") {
        x = v[2] * 0.1;
        y = v[3] * 0.65;
      } else if (legendPosition === "upper-right") {
        x = v[2] * 0.68;
        y = v[3] * 0.007;
      }

      const toAccount = { clinton: 0, trump: 0 };
      const nMarkers = { clinton: 0, trump: 0 };

      countyGeo.features.forEach((d) => {
        toAccount["clinton"] += d.properties.clinton;
        toAccount["trump"] += d.properties.trump;
      });

      nodes.forEach((d) => (nMarkers[d.candidate] += 1));

      const legend = selection
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${x + v[0]}, ${y + v[1]})`);

      const textContainer = legend
        .append("g")
        .attr("transform", `translate(${lp}, ${markerRadius})`)
        .style("font-size", fontSize)
        .style("letter-spacing", 0);

      textContainer.append("text").text("Region Total Votes:");

      textContainer
        .append("text")
        .attr("y", yp)
        .text(`Clinton: ${toAccount.clinton.toLocaleString()}`)
        .attr("fill", DEM);

      textContainer
        .append("text")
        .attr("y", 2 * yp)
        .text(`Trump: ${toAccount.trump.toLocaleString()}`)
        .attr("fill", REP);

      textContainer
        .append("text")
        .attr("y", 4 * yp)
        .text(`Markers Shown (${votesPerMarker.toLocaleString()} Votes Each)`);

      textContainer
        .append("circle")
        .attr("class", "marker")
        .attr("cx", markerRadius)
        .attr("cy", 5 * yp)
        .attr("r", markerRadius)
        .attr("fill", DEM);

      textContainer
        .append("text")
        .attr("x", 2 * markerRadius + lp / 2)
        .attr("y", 5 * yp)
        .attr("alignment-baseline", "central")
        .text(
          `${nMarkers.clinton.toLocaleString()} (${(
            nMarkers.clinton * votesPerMarker
          ).toLocaleString()} Votes)`
        );

      textContainer
        .append("circle")
        .attr("class", "marker")
        .attr("cx", markerRadius)
        .attr("cy", 6 * yp)
        .attr("r", markerRadius)
        .attr("fill", REP);

      textContainer
        .append("text")
        .attr("x", 2 * markerRadius + lp / 2)
        .attr("y", 6 * yp)
        .attr("alignment-baseline", "central")
        .text(
          `${nMarkers.trump.toLocaleString()} (${(
            nMarkers.trump * votesPerMarker
          ).toLocaleString()} Votes)`
        );
    });
  };

  legend.countyGeo = function (val) {
    if (!arguments.length) return countyGeo;
    countyGeo = val;
    return legend;
  };

  legend.nodes = function (val) {
    if (!arguments.length) return nodes;
    nodes = val;
    return legend;
  };

  legend.votesPerMarker = function (val) {
    if (!arguments.length) return votesPerMarker;
    votesPerMarker = val;
    return legend;
  };

  legend.markerRadius = function (val) {
    if (!arguments.length) return markerRadius;
    markerRadius = val;
    fontSize = markerRadius * 2.2;
    yp = 1 + fontSize;
    return legend;
  };

  legend.legendPosition = function (val) {
    if (!arguments.length) return legendPosition;
    legendPosition = val;
    return legend;
  };

  return legend;
};
