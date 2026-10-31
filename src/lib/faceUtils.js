/**
 * Client-Side Face Feature Vector & Computer Vision Utilities
 * Extracts a normalized 128-dimensional spatial-gradient descriptor
 * from face regions for 1:N identification and 1:1 verification.
 */

export function extractFaceDescriptorFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // We analyze an 8x8 grid of 16-bin gradient & luminance features = 128 dimensions
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 64;
  sampleCanvas.height = 64;
  const sCtx = sampleCanvas.getContext('2d');
  sCtx.drawImage(canvas, 0, 0, 64, 64);

  const imgData = sCtx.getImageData(0, 0, 64, 64);
  const data = imgData.data;

  // Convert to grayscale matrix
  const gray = new Float32Array(64 * 64);
  for (let i = 0; i < 64 * 64; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // Compute 128-D feature vector:
  // 16 spatial blocks (4x4 grid of 16x16 pixels)
  // In each block, compute 8 directional gradient energies
  const descriptor = new Float32Array(128);
  let descriptorIdx = 0;

  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 4; bx++) {
      // For each 16x16 block
      const startX = bx * 16;
      const startY = by * 16;
      const bins = new Float32Array(8);

      for (let y = startY + 1; y < startY + 15; y++) {
        for (let x = startX + 1; x < startX + 15; x++) {
          const dx = gray[y * 64 + (x + 1)] - gray[y * 64 + (x - 1)];
          const dy = gray[(y + 1) * 64 + x] - gray[(y - 1) * 64 + x];
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          let angle = Math.atan2(dy, dx); // -pi to +pi
          if (angle < 0) angle += Math.PI * 2; // 0 to 2pi

          const bin = Math.min(7, Math.floor((angle / (Math.PI * 2)) * 8));
          bins[bin] += magnitude;
        }
      }

      for (let b = 0; b < 8; b++) {
        descriptor[descriptorIdx++] = bins[b];
      }
    }
  }

  // L2-Normalize descriptor to unit hypersphere
  let normSum = 0;
  for (let i = 0; i < 128; i++) {
    normSum += descriptor[i] * descriptor[i];
  }
  const norm = Math.sqrt(normSum) || 1;
  const finalDescriptor = [];
  for (let i = 0; i < 128; i++) {
    finalDescriptor.push(Math.round((descriptor[i] / norm) * 10000) / 10000);
  }

  return finalDescriptor;
}

export function extractFaceDescriptorFromMedia(mediaElement) {
  const canvas = document.createElement('canvas');
  const width = mediaElement.videoWidth || mediaElement.naturalWidth || mediaElement.width || 320;
  const height = mediaElement.videoHeight || mediaElement.naturalHeight || mediaElement.height || 240;

  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Crop center region (where face is expected)
  const cropSize = Math.min(width, height) * 0.75;
  const cropX = (width - cropSize) / 2;
  const cropY = (height - cropSize) / 2;

  ctx.drawImage(mediaElement, cropX, cropY, cropSize, cropSize, 0, 0, 320, 320);
  return extractFaceDescriptorFromCanvas(canvas);
}

export function euclideanDistance(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

