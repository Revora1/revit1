import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

export async function processImageFile(file: File): Promise<File> {
  let fileToProcess = file;

  const isHeic = 
    file.type === 'image/heic' || 
    file.type === 'image/heif' || 
    file.name.toLowerCase().endsWith('.heic') || 
    file.name.toLowerCase().endsWith('.heif');
  
  if (isHeic) {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const newName = file.name.replace(/\.heic|\.heif/i, '.jpg');
      fileToProcess = new File([blob], newName, { type: 'image/jpeg' });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
    }
  }
  
  // Compress the image
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    const compressedBlob = await imageCompression(fileToProcess, options);
    return new File([compressedBlob], fileToProcess.name, { type: compressedBlob.type || 'image/jpeg' });
  } catch (error) {
    console.error('Image compression failed:', error);
    return fileToProcess;
  }
}
