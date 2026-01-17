/**
 * Image Processing Utilities for better OCR
 */

export const processImageForOCR = async (imageSource: HTMLImageElement | HTMLVideoElement): Promise<string> => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) throw new Error('Could not get canvas context')

  // Set canvas dimensions
  const width = 'videoWidth' in imageSource ? imageSource.videoWidth : imageSource.naturalWidth
  const height = 'videoHeight' in imageSource ? imageSource.videoHeight : imageSource.naturalHeight
  
  canvas.width = width
  canvas.height = height

  // 1. Draw original image
  ctx.drawImage(imageSource, 0, 0, width, height)
  
  // Get raw pixel data
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // 2. Apply Grayscale & High Contrast
  // This simple algorithm makes text stand out against paper background
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    
    // Standard luminosity method
    let gray = 0.299 * r + 0.587 * g + 0.114 * b
    
    // Increase Contrast (Thresholding)
    // If pixel is light, make it white. If dark, make it black.
    // Threshold can be adjusted (128 is mid-point)
    // For receipts (black text on white paper), a higher threshold often works well to clean noise
    // But too high might kill faint text. Let's try dynamic or a safe soft-threshold.
    
    // Soft contrast increase
    gray = gray > 180 ? 255 : (gray < 80 ? 0 : gray)
    // Or simple contrast stretch:
    // gray = (gray - 128) * 2 + 128
    
    data[i] = gray     // R
    data[i + 1] = gray // G
    data[i + 2] = gray // B
    // Alpha (data[i+3]) remains unchanged
  }

  // Put processed data back
  ctx.putImageData(imageData, 0, 0)

  // Return as data URL
  return canvas.toDataURL('image/jpeg', 0.9)
}
