# Large File Upload with Chunking

This document explains the architecture and logic of the chunked file upload system implemented in this application.

## Overview

The system allows uploading large files (e.g., 10MB+) by splitting them into smaller chunks on the client side, uploading them individually, and reassembling them on the server. This approach:

- Prevents memory issues with large files
- Allows resumable uploads (if needed in the future)
- Works around server upload size limits
- Provides progress tracking

## Architecture Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │         │   Server    │         │   Storage   │
│   (HTML)    │         │  (NestJS)   │         │             │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Select File       │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │  2. Split into Chunks │                       │
       │     (1MB each)        │                       │
       │                       │                       │
       │  3. Upload Chunk 0    │                       │
       ├──────────────────────>│                       │
       │                       │  4. Save to temp/     │
       │                       ├──────────────────────>│
       │                       │  5. Move to folder/   │
       │                       ├──────────────────────>│
       │  6. Progress Response │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │  7. Upload Chunk 1    │                       │
       ├──────────────────────>│ (Repeat 4-6)          │
       │                       │                       │
       │       ...             │       ...             │
       │                       │                       │
       │  8. Upload Last Chunk │                       │
       ├──────────────────────>│                       │
       │                       │  9. Check all chunks  │
       │                       │     uploaded          │
       │                       │                       │
       │                       │ 10. Assemble chunks   │
       │                       ├──────────────────────>│
       │                       │                       │
       │                       │ 11. Create final file │
       │                       │<──────────────────────┤
       │ 12. Completion        │                       │
       │     Response          │                       │
       │<──────────────────────┤                       │
       │                       │                       │
```

## File Structure

```
uploads/
├── avatar/                          # Single file uploads
│   └── {timestamp}-{random}-file.jpg
├── chunks/
│   ├── temp/                        # Temporary upload location
│   │   └── {timestamp}-{random}-file.jpg (deleted after move)
│   │
│   └── {session-name}-{uploadId}/   # Organized by session
│       ├── filename.jpg.part.00000  # Chunk 0
│       ├── filename.jpg.part.00001  # Chunk 1
│       ├── filename.jpg.part.00002  # Chunk 2
│       └── ...                      # More chunks
│
└── completed/                       # Assembled files
    └── {timestamp}-{random}-filename.jpg
```

## Key Technical Decisions

### Why Temp Folder + Move?

**Problem:** Multer's `destination` and `filename` callbacks execute BEFORE `req.body` is parsed.

**Impact:**

- `body.chunkIndex` is undefined → can't name file correctly
- `body.folderName` is undefined → can't organize by session

**Solution:**

1. Upload to temp with unique name
2. In controller (where `req.body` IS available), move to correct location with correct name

### Why Not Direct Upload?

Alternative approaches considered but not used:

1. **Custom Multer Storage Engine** - More complex, not necessary
2. **Body Parser Configuration** - Doesn't solve the ordering issue
3. **Different Multer Library** - Adds dependency, same core issue

The temp + move approach is simple, reliable, and efficient (rename is fast).

## API Reference

### POST /user/upload/large-file

**Request:**

- Method: `POST`
- Content-Type: `multipart/form-data`

**Form Fields:**

```typescript
files: File              // The chunk data
chunkIndex: string       // Current chunk index (0-based)
totalChunks: string      // Total number of chunks
fileName: string         // Original file name
fileSize: string         // Total file size in bytes
name: string             // Session/folder name
uploadId: string         // Unique upload session ID
```

**Response (In Progress):**

```json
{
  "message": "Chunk 1/11 uploaded successfully",
  "status": "uploading",
  "chunkIndex": 0,
  "totalChunks": 11,
  "fileName": "example.jpg",
  "progress": 9
}
```

**Response (Completed):**

```json
{
  "message": "File uploaded and assembled successfully",
  "status": "completed",
  "fileName": "1768993045221-211605842-example.jpg",
  "originalFileName": "example.jpg",
  "url": "/uploads/completed/1768993045221-211605842-example.jpg",
  "path": "/full/path/to/file.jpg",
  "totalChunks": 11,
  "size": 10485760
}
```

### GET /user/merge/file

Manual merge endpoint if needed:

**Query Parameters:**

- `fileName`: Original file name
- `folderName`: Folder containing chunks

**Response:** Same as upload completion response

## Error Handling

### Client Side

```javascript
try {
  await uploadFileInChunks(...);
} catch (error) {
  console.error('Upload error:', error);
  // Display error to user
  result.innerHTML = `<h3 style="color:red;">✗ Upload failed: ${error.message}</h3>`;
}
```
