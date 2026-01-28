# Media Storage Service Contracts Specification

> Abstract interfaces for storing and retrieving multimodal content (images, audio, etc.). Infrastructure layer implements these contracts.

---

## Overview

The media storage abstraction handles binary content separately from the database:

- Nodes contain references to media, not the media itself
- Binary files stored in filesystem for efficient access
- Thumbnails and previews generated for fast UI rendering
- Cleanup coordinated with Node lifecycle

---

## MediaStorageService Interface

The core interface for media operations.

### Store Operations

**storeImage**
- Input: imageData (binary), mimeType, loomTreeId
- Generates unique filename from content hash
- Stores in organized directory structure
- Generates thumbnail
- Returns: ImageReference object

**storeAudio**
- Input: audioData (binary), mimeType, loomTreeId
- Generates unique filename from content hash
- Stores in organized directory structure
- Extracts duration metadata
- Returns: AudioReference object

**storeFromUri**
- Input: uri (local file or picked from gallery), loomTreeId
- Determines media type from uri or content inspection
- Copies to managed storage
- Returns: ImageReference or AudioReference

### Retrieve Operations

**getImageData**
- Input: imageRef (string, the reference from Node content)
- Returns: binary data, mimeType, or null if not found

**getImageThumbnail**
- Input: imageRef
- Returns: binary data of thumbnail, or null

**getAudioData**
- Input: audioRef (string, the reference from Node content)
- Returns: binary data, mimeType, or null if not found

**getFilePath**
- Input: ref (any media reference)
- Returns: absolute filesystem path for native playback APIs

**exists**
- Input: ref
- Returns: boolean, whether the file exists

### Metadata Operations

**getImageMetadata**
- Input: imageRef
- Returns: ImageMetadata or null

**getAudioMetadata**
- Input: audioRef
- Returns: AudioMetadata or null

### Cleanup Operations

**deleteByReference**
- Input: ref
- Removes the file and any associated thumbnails/previews
- Returns: boolean success

**deleteByLoomTree**
- Input: loomTreeId
- Removes all media files associated with this Loom Tree
- Returns: count of files deleted

**findOrphaned**
- Scans storage for files not referenced by any Node
- Returns: array of orphaned file references

**cleanupOrphaned**
- Removes all orphaned files
- Returns: count of files deleted, bytes freed

---

## Reference Objects

### ImageReference Properties

- **ref** — string, unique identifier/path for the image
- **mimeType** — string (image/png, image/jpeg, image/webp, image/gif)
- **width** — number, pixels
- **height** — number, pixels
- **sizeBytes** — number, file size
- **thumbnailRef** — string, reference to thumbnail version
- **contentHash** — string, SHA-256 of original image data

### AudioReference Properties

- **ref** — string, unique identifier/path for the audio
- **mimeType** — string (audio/mp3, audio/wav, audio/m4a, audio/ogg)
- **durationMs** — number, length in milliseconds
- **sizeBytes** — number, file size
- **sampleRate** — optional number, Hz
- **contentHash** — string, SHA-256 of original audio data

### ImageMetadata Properties

- **width** — number
- **height** — number
- **mimeType** — string
- **sizeBytes** — number
- **createdAt** — timestamp, when stored
- **exifData** — optional object, extracted EXIF if available

### AudioMetadata Properties

- **durationMs** — number
- **mimeType** — string
- **sizeBytes** — number
- **sampleRate** — optional number
- **channels** — optional number (1 for mono, 2 for stereo)
- **createdAt** — timestamp, when stored

---

## Directory Structure

### Organization

Media files are organized by Loom Tree for easy bulk operations:

```
app_data/
└── media/
    ├── {loomTreeId}/
    │   ├── images/
    │   │   ├── {hash}.png
    │   │   ├── {hash}.jpg
    │   │   └── ...
    │   ├── thumbnails/
    │   │   ├── {hash}_thumb.jpg
    │   │   └── ...
    │   └── audio/
    │       ├── {hash}.mp3
    │       └── ...
    └── {anotherLoomTreeId}/
        └── ...
```

### Naming Conventions

- Filenames use content hash (enables deduplication)
- Extension matches mimeType
- Thumbnails suffixed with `_thumb`
- No user-provided filenames (security, uniqueness)

### Path Resolution

- References are relative to media root
- Format: `{loomTreeId}/images/{hash}.{ext}`
- Absolute path computed at runtime based on app data directory

---

## Thumbnail Generation

### Image Thumbnails

**Specifications**
- Maximum dimension: 200px (width or height, maintain aspect ratio)
- Format: JPEG (quality 80) for photos, PNG for graphics with transparency
- Generated synchronously on store (fast enough for mobile)

**When Generated**
- Automatically on storeImage
- Can be regenerated if missing

### Audio Thumbnails (Future)

- Waveform visualization as PNG
- Not required for MVP
- Placeholder icon used instead

---

## Content Validation

### Image Validation

- Verify file is valid image (can be decoded)
- Check dimensions (reject if either dimension > 8192px for memory safety)
- Check file size (reject if > 20MB)
- Supported formats: PNG, JPEG, WebP, GIF (user selectable frame, defaults to first frame), HEIC

### Audio Validation

- Verify file is valid audio (can be decoded)
- Check duration (reject if > 30 minutes for MVP)
- Check file size (reject if > 100MB)
- Supported formats: MP3, WAV, M4A, OGG, AAC

### Validation Errors

- **invalidFormat** — file is not a supported media type
- **corruptFile** — file cannot be decoded
- **dimensionsTooLarge** — image exceeds maximum dimensions
- **fileTooLarge** — file exceeds size limit
- **durationTooLong** — audio exceeds duration limit

---

## Deduplication

### Strategy

- Content hash (SHA-256) used as filename
- Storing identical content returns existing reference
- Reference counting not implemented (simplicity)
- Orphan cleanup handles unused duplicates

### Deduplication Flow

1. Compute hash of incoming content
2. Check if file with that hash exists in target loomTreeId directory
3. If exists and valid, return existing reference
4. If not exists, store new file

### Cross-Tree Deduplication

- Not implemented for MVP (files are per-Loom Tree)
- Could be added later for storage efficiency
- Would require reference counting for safe deletion

---

## Error Handling

### MediaStorageError

- **code** — enum identifying the error type
- **message** — human-readable description
- **path** — optional, the file path involved

### Error Codes

- **storeFailed** — could not write file to disk
- **readFailed** — could not read file from disk
- **deleteFailed** — could not delete file
- **validationFailed** — content failed validation (see validation errors)
- **insufficientSpace** — not enough disk space
- **permissionDenied** — no access to storage directory
- **notFound** — referenced file does not exist

### Recovery Strategies

- storeFailed: check disk space, retry once
- readFailed: file may be corrupt, mark as unavailable in UI
- insufficientSpace: alert user, suggest cleanup
- notFound: Node references invalid media, show placeholder

---

## Platform Considerations

### iOS

- Store in app's Documents or Library directory
- Files included in iCloud backup by default (can be excluded)
- Use FileManager for operations

### Android

- Store in app's internal storage (Context.getFilesDir) or external app storage
- Not accessible to other apps
- Handle storage permissions if using external storage

### React Native Integration

- Use react-native-fs or expo-file-system
- Abstract platform differences in implementation
- Contract is platform-agnostic

---

## Memory Management

### Loading Strategy

- Never load full image into memory for display
- Use platform image loading (resizes automatically)
- Thumbnails for list views
- Full images only when user zooms/views detail

### Audio Streaming

- Stream audio playback, don't load entire file
- Use native audio player APIs (AVPlayer, MediaPlayer or ExoPlayer)
- Reference by file path, not data

### Batch Operations

- Process media files one at a time
- Release memory between operations
- Cleanup jobs run during idle periods

---

## Testing Support

### MockMediaStorageService

For unit and integration testing:

- Store operations succeed with generated references
- Retrieve operations return test data
- Configurable failures for error handling tests
- In-memory storage (no filesystem)

### Test Patterns

- Verify correct directory structure
- Test deduplication behavior
- Test cleanup removes correct files
- Test validation rejects invalid files
- Test error handling for storage failures