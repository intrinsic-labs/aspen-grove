import type { OpenLoomDocument } from '../format';
import { detectLoomFormat, type LoomImportFormat } from './detect';
import {
  adaptLoomsidian,
  adaptOpenLoomV1,
  adaptOpenLoomV2,
  adaptSocketteerLoom,
} from './adapters';

export type ParsedLoomImport = {
  readonly sourceFormat: LoomImportFormat;
  readonly document: OpenLoomDocument;
};

/**
 * Parses any supported loom file into an OpenLoom v2 document.
 *
 * Import accepts every format we can read; OpenLoom is the only export
 * target. Throws with a user-presentable message when the format is
 * unrecognized or unsupported.
 */
export const parseLoomImport = (raw: string): ParsedLoomImport => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  const format = detectLoomFormat(parsed);
  switch (format) {
    case 'open-loom-v2':
      return { sourceFormat: format, document: adaptOpenLoomV2(parsed) };
    case 'open-loom-v1':
      return { sourceFormat: format, document: adaptOpenLoomV1(parsed) };
    case 'socketteer-loom':
      return { sourceFormat: format, document: adaptSocketteerLoom(parsed) };
    case 'loomsidian':
      return { sourceFormat: format, document: adaptLoomsidian(parsed) };
    case 'miniloom':
      // MiniLoom nodes are diff-match-patch patches against the parent's
      // rendered text (spec §8.4); materializing them needs a diff library.
      throw new Error(
        'MiniLoom files are not supported yet — convert to OpenLoom first.'
      );
    default:
      throw new Error(
        'Unrecognized loom format. Supported: OpenLoom, socketteer loom, Loomsidian.'
      );
  }
};
