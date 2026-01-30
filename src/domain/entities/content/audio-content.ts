/**
 * Audio Content
 *
 * Represents audio content within a Node.
 * Audio files are stored in the file system; this interface
 * holds the reference and metadata.
 */

export interface AudioContent {
  readonly type: 'audio';

  /** Reference to audio file in media storage */
  readonly ref: string;

  /** MIME type (e.g., 'audio/mp3', 'audio/wav', 'audio/m4a') */
  readonly mimeType: string;

  /** Duration in milliseconds */
  readonly durationMs: number;

  /** Optional reference to transcript Node */
  readonly transcriptRef?: string;
}

/**
 * Create an AudioContent object
 */
export function createAudioContent(params: {
  ref: string;
  mimeType: string;
  durationMs: number;
  transcriptRef?: string;
}): AudioContent {
  return {
    type: 'audio',
    ref: params.ref,
    mimeType: params.mimeType,
    durationMs: params.durationMs,
    transcriptRef: params.transcriptRef,
  };
}

/**
 * Type guard for AudioContent
 */
export function isAudioContent(content: unknown): content is AudioContent {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as AudioContent).type === 'audio'
  );
}
