// Shared shader performance configuration
export const shaderConfig = {
  // Cap pixel ratio to reduce GPU load (1 = CSS pixels, 2 = retina)
  maxPixelRatio: 1,
  
  // Target frame rate (lower = better performance, 60 = smooth, 30 = acceptable)
  targetFPS: 60,
  
  // Get capped device pixel ratio
  getPixelRatio: () => Math.min(window.devicePixelRatio || 1, shaderConfig.maxPixelRatio),
  
  // Frame time in ms for throttling
  getFrameTime: () => 1000 / shaderConfig.targetFPS,
};

// Utility to setup canvas with proper sizing
export function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = shaderConfig.getPixelRatio();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  return { width: canvas.width, height: canvas.height, dpr };
}

// Utility to check if canvas needs resize
export function needsResize(canvas: HTMLCanvasElement): boolean {
  const dpr = shaderConfig.getPixelRatio();
  const width = canvas.clientWidth * dpr;
  const height = canvas.clientHeight * dpr;
  
  return canvas.width !== width || canvas.height !== height;
}
