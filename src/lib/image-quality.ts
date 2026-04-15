import sharp from "sharp";

export interface QualityFlags {
  blurry: boolean;        // low variance in Laplacian proxy
  underexposed: boolean;  // mean luminance < 25
  overexposed: boolean;   // mean luminance > 230 OR >20% pixels clipped
  lowContrast: boolean;   // stddev < 20
}

export async function analyzeImage(buffer: Buffer): Promise<QualityFlags> {
  // Resize small for speed
  const { data } = await sharp(buffer)
    .resize(400, 400, { fit: "inside" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const len = data.length;
  let sum = 0, sumSq = 0, clipped = 0;
  for (let i = 0; i < len; i++) {
    const v = data[i];
    sum += v;
    sumSq += v * v;
    if (v > 250) clipped++;
  }
  const mean = sum / len;
  const variance = sumSq / len - mean * mean;
  const stddev = Math.sqrt(variance);
  const clippedPct = clipped / len;

  return {
    blurry: stddev < 15,
    underexposed: mean < 25,
    overexposed: mean > 230 || clippedPct > 0.2,
    lowContrast: stddev < 20 && mean >= 25 && mean <= 230,
  };
}
