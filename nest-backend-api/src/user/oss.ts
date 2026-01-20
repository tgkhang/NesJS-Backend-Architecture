// oss: object storage server
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

interface ChunkUploadBody {
  name?: string;
  fileName?: string;
  chunkIndex?: string;
  totalChunks?: string;
  fileSize?: string;
  uploadId?: string;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatar');
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      '-' +
      file.originalname;
    cb(null, uniqueSuffix);
  },
});

// Storage configuration for chunked uploads
const chunkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the 'uploadId' field from body to create unique folder for each upload session
    const body = req.body as ChunkUploadBody;
    const baseName: string = body?.name || 'default';
    const uploadId: string = body?.uploadId || 'default';

    // Create folder with format: baseName-uploadId
    const folderName = `${baseName}-${uploadId}`;

    const uploadDir = path.join(process.cwd(), 'uploads', 'chunks', folderName);
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating chunk directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create ordered chunk filename: originalname.part.{chunkIndex}
    const body = req.body as ChunkUploadBody;
    const fileName: string = body?.fileName || file.originalname;
    const chunkIndex: string = body?.chunkIndex || '0';
    const chunkFilename = `${fileName}.part.${String(chunkIndex).padStart(5, '0')}`;
    cb(null, chunkFilename);
  },
});

export { storage, chunkStorage };
