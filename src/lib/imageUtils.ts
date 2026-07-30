import heic2any from 'heic2any';

export async function processImageFile(file: File): Promise<File> {
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
      return new File([blob], newName, { type: 'image/jpeg' });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      // Fallback to original file if conversion fails
      return file;
    }
  }
  
  return file;
}
