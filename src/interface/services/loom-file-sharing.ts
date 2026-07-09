import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Writes text to a cache file and hands it to the native share sheet.
 * Interface-layer concern: use cases produce the text; this moves it off
 * device.
 */
export const shareTextAsFile = async (input: {
  readonly content: string;
  readonly fileName: string;
  readonly mimeType: string;
}): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  const file = new File(Paths.cache, input.fileName);
  if (file.exists) {
    file.delete();
  }
  file.write(input.content);

  await Sharing.shareAsync(file.uri, {
    mimeType: input.mimeType,
    dialogTitle: input.fileName,
  });
};

/**
 * Opens the document picker and reads the chosen file as text.
 * Returns null when the user cancels.
 */
export const pickAndReadTextFile = async (): Promise<{
  readonly name: string;
  readonly content: string;
} | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    // .openloom and loom-family exports lack a registered UTI/MIME type on
    // both platforms, so accept everything and let format detection decide.
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const content = await new File(asset.uri).text();
  return { name: asset.name, content };
};
