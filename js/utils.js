// utils.js — Random color helpers

function makeRandomColor(rMin, rRange, gMin, gRange, bMin, bRange) {
  const r = Math.floor(Math.random() * rRange) + rMin;
  const g = Math.floor(Math.random() * gRange) + gMin;
  const b = Math.floor(Math.random() * bRange) + bMin;
  return (r << 16) | (g << 8) | b;
}

export function getRandomColor() {
  return makeRandomColor(64, 192, 64, 192, 128, 128);
}

export function getRandomColor1() {
  return makeRandomColor(192, 64, 192, 64, 128, 128);
}

export function getRandomColor3() {
  return makeRandomColor(0, 256, 128, 128, 0, 256);
}
