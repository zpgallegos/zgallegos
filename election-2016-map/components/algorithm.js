const CANDS = ["clinton", "trump"];

export const centroid = (geometry) => {
  const coords = geometry.coordinates;

  switch (geometry.type) {
    case "Polygon":
      return geometric.polygonCentroid(coords[0]);
    case "MultiPolygon":
      const xVals = coords
        .map((a) => a[0])
        .map((b) => b.map((c) => c[0]))
        .flat();
      const yVals = coords
        .map((a) => a[0])
        .map((b) => b.map((c) => c[1]))
        .flat();
      const extentX = d3.extent(xVals);
      const extentY = d3.extent(yVals);
      return [d3.median(extentX), d3.median(extentY)];
  }
};

const createMergedShape = (topoData, ids) =>
  topojson.merge(
    topoData,
    topoData.objects.counties.geometries.filter((d) => ids.includes(d.id))
  );

const maxValueKey = (obj) =>
  Object.keys(obj).reduce((x, y) => (obj[x] > obj[y] ? x : y));

const chooseBestInitial = (features, account, candidate) =>
  // return feature of county that has most votes left unaccounted for
  features.find((d) => d.id === maxValueKey(account[candidate]));

const chooseBestNeighbor = (
  features,
  topStackCounty,
  visited,
  account // indexed to candidate
) => {
  if (!topStackCounty) throw "unreachable"; // end of stack, a county is unreachable
  const neighbors = topStackCounty.properties.neighbors;
  const unvisited = features
    .filter((d) => neighbors.includes(d.id))
    .filter((d) => !visited.has(d.id));

  if (!unvisited.length) return null; // no unvisited neighbors, signal to backtrack

  const unvisitedAccount = Object.keys(account)
    .filter((key) => unvisited.map((d) => d.id).includes(key))
    .reduce((map, key) => {
      map[key] = account[key];
      return map;
    }, {});

  return unvisited.find((d) => d.id === maxValueKey(unvisitedAccount));
};

const generateMarkers = (topoData, features, votesPerMarker) => {
  const markers = [];
  const account = {}; // track votes accounted for by markers

  // place any markers for counties that have enough votes on their own
  for (let cand of CANDS) {
    account[cand] = {};

    for (let county of features) {
      const votes = county.properties[cand];
      account[cand][county.id] = votes; // initialize votes to account for

      if (votes >= votesPerMarker) {
        const countyCentroid = centroid(county.geometry);
        const numMarkers = Math.floor(votes / votesPerMarker);
        const marker = {
          countyIds: [county.id],
          candidate: cand,
          x: countyCentroid[0],
          y: countyCentroid[1],
          pass: -1,
        };
        // place them all at the same point. will be collided later
        markers.push(...Array(numMarkers).fill(marker));
        account[cand][county.id] -= numMarkers * votesPerMarker;
      }
    }
  }

  // place markers that account for remaining votes in merged counties
  for (let cand of CANDS) {
    const visited = new Set(); // continue until all counties visited
    const stack = []; // stack to backtrack if no neighbors left
    let shapes = []; // accumulated county shapes to merge
    let running = 0; // running vote count
    let merged; // merged county shape

    let currCounty = chooseBestInitial(features, account, cand);

    visited.add(currCounty.id);
    shapes.push(currCounty.id);
    stack.push(currCounty);

    running += account[cand][currCounty.id];
    account[cand][currCounty.id] = 0;

    while (visited.size < features.length) {
      while (true) {
        // get next county
        try {
          currCounty = chooseBestNeighbor(
            features,
            stack[stack.length - 1],
            visited,
            account[cand]
          );
        } catch (e) {
          const unreach = features.filter((d) => !visited.has(d.id));
          console.log("unreachable:", unreach);
          throw "reached end of stack. this likely means there is an unreachable county";
        }
        if (currCounty) {
          visited.add(currCounty.id);
          stack.push(currCounty);
          break;
        } else {
          stack.pop(); // backtrack
        }
      }

      running += account[cand][currCounty.id];
      account[cand][currCounty.id] = 0;
      shapes.push(currCounty.id);

      if (running >= votesPerMarker) {
        merged = createMergedShape(topoData, shapes);
        const countyCentroid = centroid(merged);
        const marker = {
          countyIds: shapes,
          candidate: cand,
          x: countyCentroid[0],
          y: countyCentroid[1],
          pass: 1,
        };
        markers.push(marker);
        running -= votesPerMarker;
        shapes = [shapes[shapes.length - 1]];
      }
    }
  }
  return markers;
};

export const generateMarkersByState = (topoData, countyGeo, votesPerMarker) => {
  const states = countyGeo.features.reduce(
    (set, row) => set.add(row.properties.state),
    new Set()
  );

  const markers = [];
  for (let state of states) {
    const stateFeatures = countyGeo.features.filter(
      (d) => d.properties.state === state
    );
    markers.push(...generateMarkers(topoData, stateFeatures, votesPerMarker));
  }
  return markers;
};
