// Equirectangular projection for the tour route maps. Bounds roughly
// -29 to -17 latitude and 11.5 to 25.5 longitude; x is scaled by
// cos(23 deg) (Namibia's mid-latitude) so the country keeps its shape.
// assets/images/namibia-outline.svg was projected with these same numbers.

const BOUNDS = { north: -17, south: -29, west: 11.5, east: 25.5 };
const SCALE = 40; // px per degree of latitude
const X_SCALE = SCALE * Math.cos((23 * Math.PI) / 180);

const WIDTH = Math.round((BOUNDS.east - BOUNDS.west) * X_SCALE);
const HEIGHT = Math.round((BOUNDS.north - BOUNDS.south) * SCALE);

function project(lat, lng) {
  return {
    x: Math.round((lng - BOUNDS.west) * X_SCALE * 10) / 10,
    y: Math.round((BOUNDS.north - lat) * SCALE * 10) / 10,
  };
}

module.exports = { BOUNDS, WIDTH, HEIGHT, project };
