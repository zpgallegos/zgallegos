import { generateMarkersByState } from "./algorithm.js";
import { Legend } from "./Legend.js";

export const DEM = "#2196f3";
export const REP = "#d32f2f";

export const ElectionMap = () => {
  let topoData;
  let stateGeo;
  let countyGeo;
  let votesPerMarker;
  let plotType;
  let sizeScale;
  let markers;
  let nodes;
  let legendPosition;
  let ticked;
  let animationStep;
  let simulation;
  let markerRadius;

  const geoPath = d3.geoPath();

  const map = (selection) => {
    selection.each(() => {
      const tooltip = d3.select(".tooltip").style("opacity", 0);

      const mouseover = (d) => {
        let html = "";
        html += `<strong>${d.properties.county} (${d.properties.state})</strong>`;
        html += `<br/><span style="color: ${DEM};">Clinton: ${d.properties.clinton.toLocaleString()}</span>`;
        html += `<br/><span style="color: ${REP};">Trump: ${d.properties.trump.toLocaleString()}</span>`;
        tooltip
          .html(html)
          .transition()
          .duration(200)
          .style("left", d3.event.pageX + 10 + "px")
          .style("top", d3.event.pageY - 40 + "px")
          .style("opacity", 0.95);
      };

      const mouseout = () => {
        tooltip.transition().duration(200).style("opacity", 0);
      };

      const counties = selection.append("g").attr("class", "counties");
      const states = selection.append("g").attr("class", "states");

      counties
        .selectAll("path")
        .data(countyGeo.features)
        .join("path")
        .attr("id", (d) => `county-${d.id}`)
        .attr("d", geoPath)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

      states
        .selectAll("path")
        .data(stateGeo.features)
        .join("path")
        .attr("id", (d) => `state-${d.id}`)
        .attr("d", geoPath);

      switch (plotType) {
        case "chloropleth":
          counties
            .selectAll("path")
            .attr("fill", (d) =>
              d.properties.winner === "clinton" ? DEM : REP
            );

          states
            .selectAll("path")
            .attr("stroke", "white")
            .attr("stroke-width", 0.5);

          break;
        case "circles":
          counties
            .selectAll("circle")
            .data(countyGeo.features)
            .join("circle")
            .attr("cx", (d) => d.properties.centroid[0])
            .attr("cy", (d) => d.properties.centroid[1])
            .attr("r", (d) => sizeScale(d.properties.votes))
            .attr("fill", (d) =>
              d.properties.winner === "clinton" ? DEM : REP
            )
            .attr("stroke", "black")
            .attr("stroke-width", 0.1)
            .attr("opacity", 0.5);

          break;

        case "doubleCircle":
          const circleG = selection.append("g");

          circleG
            .selectAll(".circle-trump")
            .data(countyGeo.features)
            .join("circle")
            .attr("class", "circle-trump")
            .attr("cx", (d) => d.properties.centroid[0])
            .attr("cy", (d) => d.properties.centroid[1])
            .attr("r", (d) => sizeScale(d.properties.trump))
            .attr("fill", REP)
            .attr("stroke", "black")
            .attr("stroke-width", 0.1)
            .attr("opacity", 0.5);

          circleG
            .selectAll(".circle-clinton")
            .data(countyGeo.features)
            .join("circle")
            .attr("class", "circle-clinton")
            .attr("cx", (d) => d.properties.centroid[0])
            .attr("cy", (d) => d.properties.centroid[1])
            .attr("r", (d) => sizeScale(d.properties.clinton))
            .attr("fill", DEM)
            .attr("stroke", "black")
            .attr("stroke-width", 0.1)
            .attr("opacity", 0.5);
          break;

        case "markers":
          markers = generateMarkersByState(topoData, countyGeo, votesPerMarker);
          nodes = markers.map((d, index) => {
            return {
              index: index,
              countyIds: d.countyIds,
              candidate: d.candidate,
              x: d.x,
              y: d.y,
              shape: d.shape,
            };
          });

          const markerG = selection.append("g");

          ticked = () => {
            markerG
              .selectAll("circle")
              .data(nodes)
              .join("circle")
              .attr("class", "marker")
              .attr("cx", (d) => d.x)
              .attr("cy", (d) => d.y)
              .attr("r", markerRadius)
              .attr("fill", (d) => (d.candidate === "clinton" ? DEM : REP));
          };

          simulation = d3
            .forceSimulation(nodes)
            .force(
              "x",
              d3.forceX().x((d) => d.x)
            )
            .force(
              "y",
              d3.forceY().y((d) => d.y)
            )
            .force("collide", d3.forceCollide().radius(markerRadius))
            .on("tick", ticked);

          if (legendPosition) {
            const legend = Legend()
              .countyGeo(countyGeo)
              .nodes(nodes)
              .votesPerMarker(votesPerMarker)
              .markerRadius(markerRadius)
              .legendPosition(legendPosition);

            selection.call(legend);
          }

          break;

        case "markers-animated":
          markers = generateMarkersByState(topoData, countyGeo, votesPerMarker);

          const keys = markers.reduce(
            (set, d) => set.add(d.countyIds),
            new Set()
          );

          nodes = [];
          for (let key of keys) {
            const obj = {};
            const f = markers.filter((d) => d.countyIds == key);
            const a = f.reduce((arr, d) => {
              arr.push({
                candidate: d.candidate,
                x: d.x,
                y: d.y,
                pass: d.pass,
              });
              return arr;
            }, []);
            obj[key] = a;
            nodes.push(obj);
          }

          nodes.sort((a, b) => {
            const f = (x) => Object.values(x)[0][0];
            if (f(a).candidate < f(b).candidate) return -1;
            if (f(a).candidate > f(b).candidate) return 1;
            if (f(a).pass < f(b).pass) return -1;
            if (f(a).pass > f(b).pass) return 1;
            if (f(a).x < f(b).x) return -1;
            if (f(a).x > f(b).x) return 1;
            if (f(a).y < f(b).y) return -1;
            if (f(a).y > f(b).y) return 1;
            return 0;
          });

          let i = 0;
          let runNodes = [];
          let node = selection.append("g").selectAll("circle");

          ticked = function () {
            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
          };

          simulation = d3
            .forceSimulation()
            .force(
              "x",
              d3.forceX().x((d) => d.x)
            )
            .force(
              "y",
              d3.forceY().y((d) => d.y)
            )
            .force("collide", d3.forceCollide().radius(markerRadius))
            .on("tick", ticked);

          setInterval(() => {
            const step = nodes[i];
            const key = Object.keys(step)[0];
            runNodes.push(...step[key]);
            runNodes.forEach((_, i) => (runNodes[i].index = i));

            counties
              .selectAll(".highlighted-dem")
              .classed("highlighted-dem", false);
            counties
              .selectAll(".highlighted-rep")
              .classed("highlighted-rep", false);

            const cls =
              "highlighted-" +
              (step[key][0].candidate == "clinton" ? "dem" : "rep");

            for (let c of key.split(",")) {
              counties.selectAll(`#county-${c}`).attr("class", cls);
            }

            if (i) simulation.stop();

            const old = new Map(node.data().map((d) => [d.index, d]));
            runNodes = runNodes.map((d) =>
              Object.assign(old.get(d.index) || {}, d)
            );

            node = node
              .data(runNodes, (d) => d.index)
              .join((enter) =>
                enter
                  .append("circle")
                  .attr("class", "marker")
                  .attr("r", markerRadius * 5)
                  .attr("fill", (d) => (d.candidate === "clinton" ? DEM : REP))
                  .call((enter) =>
                    enter
                      .transition()
                      .duration(500)
                      .ease(d3.easeQuadIn)
                      .attr("r", markerRadius)
                  )
              );

            simulation.nodes(runNodes);
            simulation.alpha(1).restart();

            if (legendPosition) {
              selection.select(".legend").remove();

              const legend = Legend()
                .countyGeo(countyGeo)
                .nodes(runNodes)
                .votesPerMarker(votesPerMarker)
                .markerRadius(markerRadius)
                .legendPosition(legendPosition);

              selection.call(legend);
            }

            i++;
            if (i === nodes.length) {
              i = 0;
              runNodes = [];
            }
          }, animationStep);
      }
    });
  };

  map.topoData = function (val) {
    if (!arguments.length) return topoData;
    topoData = val;
    return map;
  };

  map.stateGeo = function (val) {
    if (!arguments.length) return stateGeo;
    stateGeo = val;
    return map;
  };

  map.countyGeo = function (val) {
    if (!arguments.length) return countyGeo;
    countyGeo = val;

    sizeScale = d3
      .scaleLinear()
      .domain(d3.extent(countyGeo.features, (d) => d.properties.votes))
      .range([1, 30]);

    return map;
  };

  map.plotType = function (val) {
    if (!arguments.length) return plotType;
    plotType = val;
    return map;
  };

  map.votesPerMarker = function (val) {
    if (!arguments.length) return votesPerMarker;
    votesPerMarker = val;
    return map;
  };

  map.legendPosition = function (val) {
    if (!arguments.length) return legendPosition;
    legendPosition = val;
    return map;
  };

  map.animationStep = function (val) {
    if (!arguments.length) return animationStep;
    animationStep = val;
    return map;
  };

  map.markerRadius = function (val) {
    if (!arguments.length) return markerRadius;
    markerRadius = val;
    return map;
  };

  return map;
};
