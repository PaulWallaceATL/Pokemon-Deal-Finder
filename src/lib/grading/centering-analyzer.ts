/**
 * Client-side canvas-based centering analyzer.
 *
 * Loads a card image, detects the outer card edge and inner artwork boundary,
 * then computes left/right and top/bottom border ratios.
 *
 * Works best with front-facing, well-lit photos of Pokemon cards where the
 * yellow/silver/colored border contrasts with the dark artwork area.
 */

export interface CenteringResult {
  frontLR: number; // wider-side % (50 = perfect center)
  frontTB: number;
  lrString: string; // e.g. "55/45"
  tbString: string;
  confidence: "high" | "medium" | "low";
  cardDetected: boolean;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Analyze a card image URL and return centering measurements.
 * Runs entirely in the browser using Canvas.
 */
export async function analyzeCentering(
  imageUrl: string
): Promise<CenteringResult> {
  try {
    const img = await loadImage(imageUrl);
    const { canvas, ctx } = createCanvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cardBounds = detectCardBounds(imageData);

    if (!cardBounds) {
      return fallbackResult();
    }

    const artworkBounds = detectArtworkBounds(imageData, cardBounds);

    if (!artworkBounds) {
      return fallbackResult();
    }

    const leftBorder = artworkBounds.left - cardBounds.left;
    const rightBorder = cardBounds.right - artworkBounds.right;
    const topBorder = artworkBounds.top - cardBounds.top;
    const bottomBorder = cardBounds.bottom - artworkBounds.bottom;

    const horizontalTotal = leftBorder + rightBorder;
    const verticalTotal = topBorder + bottomBorder;

    if (horizontalTotal <= 0 || verticalTotal <= 0) {
      return fallbackResult();
    }

    const leftPct = (leftBorder / horizontalTotal) * 100;
    const topPct = (topBorder / verticalTotal) * 100;

    // wider-side % (always >= 50)
    const lrWider = Math.max(leftPct, 100 - leftPct);
    const tbWider = Math.max(topPct, 100 - topPct);

    const borderRatio = Math.min(horizontalTotal, verticalTotal) /
      Math.max(horizontalTotal, verticalTotal);
    const confidence = borderRatio > 0.3 && horizontalTotal > 10 && verticalTotal > 10
      ? (lrWider < 70 && tbWider < 70 ? "high" : "medium")
      : "low";

    return {
      frontLR: Math.round(lrWider * 10) / 10,
      frontTB: Math.round(tbWider * 10) / 10,
      lrString: formatRatio(lrWider),
      tbString: formatRatio(tbWider),
      confidence,
      cardDetected: true,
    };
  } catch {
    return fallbackResult();
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function getPixelLuminance(data: Uint8ClampedArray, index: number): number {
  return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
}

/**
 * Detect the outer card boundary by looking for the transition from
 * background to card (significant luminance change from the edges inward).
 */
function detectCardBounds(imageData: ImageData): Rect | null {
  const { data, width, height } = imageData;
  const threshold = 30;

  // Sample background color from corners
  const cornerSamples = [
    getPixelLuminance(data, 0),
    getPixelLuminance(data, (width - 1) * 4),
    getPixelLuminance(data, (height - 1) * width * 4),
    getPixelLuminance(data, ((height - 1) * width + (width - 1)) * 4),
  ];
  const bgLuminance = cornerSamples.reduce((a, b) => a + b, 0) / cornerSamples.length;

  const midY = Math.floor(height / 2);
  const midX = Math.floor(width / 2);

  // Scan from left
  let left = 0;
  for (let x = 0; x < width; x++) {
    const idx = (midY * width + x) * 4;
    if (Math.abs(getPixelLuminance(data, idx) - bgLuminance) > threshold) {
      left = x;
      break;
    }
  }

  // Scan from right
  let right = width - 1;
  for (let x = width - 1; x >= 0; x--) {
    const idx = (midY * width + x) * 4;
    if (Math.abs(getPixelLuminance(data, idx) - bgLuminance) > threshold) {
      right = x;
      break;
    }
  }

  // Scan from top
  let top = 0;
  for (let y = 0; y < height; y++) {
    const idx = (y * width + midX) * 4;
    if (Math.abs(getPixelLuminance(data, idx) - bgLuminance) > threshold) {
      top = y;
      break;
    }
  }

  // Scan from bottom
  let bottom = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    const idx = (y * width + midX) * 4;
    if (Math.abs(getPixelLuminance(data, idx) - bgLuminance) > threshold) {
      bottom = y;
      break;
    }
  }

  const cardWidth = right - left;
  const cardHeight = bottom - top;

  if (cardWidth < width * 0.3 || cardHeight < height * 0.3) {
    return null;
  }

  return { left, top, right, bottom };
}

/**
 * Within the detected card bounds, find the inner artwork boundary.
 * Pokemon cards have a colored border (yellow, silver, etc.) around the
 * central artwork area. We detect the transition by looking for a significant
 * color/luminance shift moving inward from the card edges.
 */
function detectArtworkBounds(imageData: ImageData, card: Rect): Rect | null {
  const { data, width } = imageData;
  const gradientThreshold = 25;
  const cardWidth = card.right - card.left;
  const cardHeight = card.bottom - card.top;
  const maxBorderSearch = Math.min(cardWidth, cardHeight) * 0.25;

  const midY = Math.floor((card.top + card.bottom) / 2);
  const midX = Math.floor((card.left + card.right) / 2);

  // Find artwork left edge: scan right from card left, detect gradient shift
  let artLeft = card.left + Math.floor(cardWidth * 0.05);
  for (let x = card.left + 2; x < card.left + maxBorderSearch; x++) {
    const idx1 = (midY * width + x) * 4;
    const idx2 = (midY * width + x + 1) * 4;
    const diff = Math.abs(
      getPixelLuminance(data, idx1) - getPixelLuminance(data, idx2)
    );
    if (diff > gradientThreshold) {
      artLeft = x + 1;
      break;
    }
  }

  // Find artwork right edge
  let artRight = card.right - Math.floor(cardWidth * 0.05);
  for (let x = card.right - 2; x > card.right - maxBorderSearch; x--) {
    const idx1 = (midY * width + x) * 4;
    const idx2 = (midY * width + x - 1) * 4;
    const diff = Math.abs(
      getPixelLuminance(data, idx1) - getPixelLuminance(data, idx2)
    );
    if (diff > gradientThreshold) {
      artRight = x - 1;
      break;
    }
  }

  // Find artwork top edge
  let artTop = card.top + Math.floor(cardHeight * 0.05);
  for (let y = card.top + 2; y < card.top + maxBorderSearch; y++) {
    const idx1 = (y * width + midX) * 4;
    const idx2 = ((y + 1) * width + midX) * 4;
    const diff = Math.abs(
      getPixelLuminance(data, idx1) - getPixelLuminance(data, idx2)
    );
    if (diff > gradientThreshold) {
      artTop = y + 1;
      break;
    }
  }

  // Find artwork bottom edge
  let artBottom = card.bottom - Math.floor(cardHeight * 0.05);
  for (let y = card.bottom - 2; y > card.bottom - maxBorderSearch; y--) {
    const idx1 = (y * width + midX) * 4;
    const idx2 = ((y - 1) * width + midX) * 4;
    const diff = Math.abs(
      getPixelLuminance(data, idx1) - getPixelLuminance(data, idx2)
    );
    if (diff > gradientThreshold) {
      artBottom = y - 1;
      break;
    }
  }

  const artWidth = artRight - artLeft;
  const artHeight = artBottom - artTop;

  if (artWidth < cardWidth * 0.5 || artHeight < cardHeight * 0.5) {
    return null;
  }

  return { left: artLeft, top: artTop, right: artRight, bottom: artBottom };
}

function formatRatio(widerPct: number): string {
  const rounded = Math.round(widerPct);
  return `${rounded}/${100 - rounded}`;
}

function fallbackResult(): CenteringResult {
  return {
    frontLR: 50,
    frontTB: 50,
    lrString: "50/50",
    tbString: "50/50",
    confidence: "low",
    cardDetected: false,
  };
}

/**
 * Server-safe centering analysis that works without DOM APIs.
 * Used during SSR or in API routes. Accepts raw pixel data.
 */
export function analyzeCenteringFromPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): CenteringResult {
  const imageData = { data: pixels, width, height } as ImageData;
  const cardBounds = detectCardBounds(imageData);
  if (!cardBounds) return fallbackResult();

  const artworkBounds = detectArtworkBounds(imageData, cardBounds);
  if (!artworkBounds) return fallbackResult();

  const leftBorder = artworkBounds.left - cardBounds.left;
  const rightBorder = cardBounds.right - artworkBounds.right;
  const topBorder = artworkBounds.top - cardBounds.top;
  const bottomBorder = cardBounds.bottom - artworkBounds.bottom;

  const horizontalTotal = leftBorder + rightBorder;
  const verticalTotal = topBorder + bottomBorder;

  if (horizontalTotal <= 0 || verticalTotal <= 0) return fallbackResult();

  const leftPct = (leftBorder / horizontalTotal) * 100;
  const topPct = (topBorder / verticalTotal) * 100;

  const lrWider = Math.max(leftPct, 100 - leftPct);
  const tbWider = Math.max(topPct, 100 - topPct);

  return {
    frontLR: Math.round(lrWider * 10) / 10,
    frontTB: Math.round(tbWider * 10) / 10,
    lrString: formatRatio(lrWider),
    tbString: formatRatio(tbWider),
    confidence: lrWider < 70 && tbWider < 70 ? "high" : "medium",
    cardDetected: true,
  };
}
