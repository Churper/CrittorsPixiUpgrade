// utils.js — Random color helpers

export function getRandomColor() {
  const r = Math.floor(Math.random() * 192) + 64;
  const g = Math.floor(Math.random() * 192) + 64;
  const b = Math.floor(Math.random() * 128) + 128;
  const color = (r << 16) | (g << 8) | b;
  return color;
}

export function getRandomColor1() {
  const r = Math.floor(Math.random() * 64) + 192;
  const g = Math.floor(Math.random() * 64) + 192;
  const b = Math.floor(Math.random() * 128) + 128;
  const color = (r << 16) | (g << 8) | b;
  return color;
}

export function getRandomColor3() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 128) + 128;
  const b = Math.floor(Math.random() * 256);
  const color = (r << 16) | (g << 8) | b;
  return color;
}
