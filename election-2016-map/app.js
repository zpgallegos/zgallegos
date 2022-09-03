import { ElectionMap } from "./components/ElectionMap.js";
import { centroid } from "./components/algorithm.js";

const svgChloro = d3
  .select("#svgChloro")
  .attr("viewBox", [0, 0, 960, 600])
  .attr("preserveAspectRatio", "xMidYMid meet");

const svgNevada = d3
  .select("#svgNevada")
  .attr("viewBox", [-20, 175, 288, 180])
  .attr("preserveAspectRatio", "xMidYMid meet");

const svgNevadaCircles = d3
  .select("#svgNevadaCircles")
  .attr("viewBox", [-20, 175, 288, 180])
  .attr("preserveAspectRatio", "xMidYMid meet");

const svgNevadaMarkersAnimated = d3
  .select("#svgNevadaMarkersAnimated")
  .attr("viewBox", [-20, 175, 288, 180])
  .attr("preserveAspectRatio", "xMidYMid meet");

const svgUSMarkers = d3
  .select("#svgUSMarkers")
  .attr("viewBox", [0, 0, 960, 600])
  .attr("preserveAspectRatio", "xMidYMid meet");

Promise.all([
  d3.json("data/us-10m.v1.json"),
  d3.json("data/election.json"),
  d3.json("data/neighbors.json"),
]).then(([topoData, voteData, neighborMap]) => {
  const stateGeo = topojson.feature(
    topoData,
    topoData.objects.states,
    (a, b) => {
      return a !== b;
    }
  );

  const countyGeo = topojson.feature(
    topoData,
    topoData.objects.counties,
    (a, b) => {
      return a !== b;
    }
  );

  countyGeo.features.forEach((d) => {
    let props;
    if (voteData[d.id]) {
      props = Object.assign({}, voteData[d.id]);
      props["centroid"] = centroid(d.geometry);
      props["neighbors"] = neighborMap[d.id].neighbors;
    } else {
      props = null;
    }
    Object.assign(d.properties, props);
  });

  const nevadaState = Object.assign({}, stateGeo);
  nevadaState.features = nevadaState.features.filter((d) => d.id == "32");

  const nevadaCounty = Object.assign({}, countyGeo);
  nevadaCounty.features = nevadaCounty.features.filter(
    (d) => d.properties.state == "Nevada"
  );

  const mapChloro = ElectionMap()
    .stateGeo(stateGeo)
    .countyGeo(countyGeo)
    .plotType("chloropleth");

  const mapNevada = ElectionMap()
    .stateGeo(nevadaState)
    .countyGeo(nevadaCounty)
    .plotType("chloropleth");

  const mapNevadaCircles = ElectionMap()
    .stateGeo(nevadaState)
    .countyGeo(nevadaCounty)
    .plotType("circles");

  const mapNevadaMarkersAnimated = ElectionMap()
    .topoData(topoData)
    .stateGeo(nevadaState)
    .countyGeo(nevadaCounty)
    .votesPerMarker(10000)
    .markerRadius(2)
    .legendPosition("lower-left")
    .plotType("markers-animated")
    .animationStep(1000);

  const mapUSMarkers = ElectionMap()
    .topoData(topoData)
    .stateGeo(stateGeo)
    .countyGeo(countyGeo)
    .votesPerMarker(100000)
    .markerRadius(3)
    .plotType("markers");

  svgChloro.call(mapChloro);
  svgNevada.call(mapNevada);
  svgNevadaCircles.call(mapNevadaCircles);
  svgNevadaMarkersAnimated.call(mapNevadaMarkersAnimated);
  svgUSMarkers.call(mapUSMarkers);
});

