import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string): Promise<string> {
  try {
    // Compress and convert to JPEG
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error("Compression error:", error);
    return uri; 
  }
}
