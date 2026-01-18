import * as fs from 'fs';
import * as path from 'path';

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
  folderName: string;
}

export class ChunkHelper {
  /**
   * Auto-detect the number of chunks for a file
   */
  static detectTotalChunks(fileName: string, folderName: string): number {
    const chunkDir = path.join(process.cwd(), 'uploads', 'chunks', folderName);

    if (!fs.existsSync(chunkDir)) {
      return 0;
    }

    const files = fs.readdirSync(chunkDir);
    const chunkPattern = new RegExp(`^${fileName}\\.part\\.(\\d{5})$`);

    let maxChunkIndex = -1;
    files.forEach((file) => {
      const match = file.match(chunkPattern);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index > maxChunkIndex) {
          maxChunkIndex = index;
        }
      }
    });

    return maxChunkIndex + 1; // Convert 0-based index to count
  }

  /**
   * Assemble all chunks into a final file
   */
  static async assembleChunks(
    metadata: ChunkMetadata,
  ): Promise<{ filePath: string; fileName: string }> {
    // eslint-disable-next-line prefer-const
    let { fileName, totalChunks, folderName } = metadata;
    const chunkDir = path.join(process.cwd(), 'uploads', 'chunks', folderName);
    const finalDir = path.join(process.cwd(), 'uploads', 'completed');

    // Auto-detect total chunks if not provided
    if (!totalChunks || totalChunks === 0) {
      totalChunks = this.detectTotalChunks(fileName, folderName);
      if (totalChunks === 0) {
        throw new Error(`No chunks found for file ${fileName}`);
      }
    }

    // Ensure final directory exists
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    // Generate unique filename for final file
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const finalFileName = `${timestamp}-${randomSuffix}-${fileName}`;
    const finalFilePath = path.join(finalDir, finalFileName);

    // Create write stream for final file
    const writeStream = fs.createWriteStream(finalFilePath);

    // Read and write chunks in order
    for (let i = 0; i < totalChunks; i++) {
      const chunkFileName = `${fileName}.part.${String(i).padStart(5, '0')}`;
      const chunkPath = path.join(chunkDir, chunkFileName);

      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i} for file ${fileName}`);
      }

      // Read chunk and append to final file
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
    }

    // Close write stream
    writeStream.end();

    // Wait for write stream to finish
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });

    return {
      filePath: finalFilePath,
      fileName: finalFileName,
    };
  }

  /**
   * Clean up chunk files after assembly
   */
  static cleanupChunks(fileName: string, folderName: string): void {
    const chunkDir = path.join(process.cwd(), 'uploads', 'chunks', folderName);

    if (!fs.existsSync(chunkDir)) {
      return;
    }

    // Find and delete all chunk files for this fileName
    const files = fs.readdirSync(chunkDir);
    const chunkPattern = new RegExp(`^${fileName}\\.part\\.\\d{5}$`);

    files.forEach((file) => {
      if (chunkPattern.test(file)) {
        const filePath = path.join(chunkDir, file);
        fs.unlinkSync(filePath);
      }
    });

    // Remove folder if empty
    const remainingFiles = fs.readdirSync(chunkDir);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(chunkDir);
    }
  }

  /**
   * Check if all chunks have been uploaded
   */
  static areAllChunksUploaded(
    fileName: string,
    totalChunks: number,
    folderName: string,
  ): boolean {
    const chunkDir = path.join(process.cwd(), 'uploads', 'chunks', folderName);

    if (!fs.existsSync(chunkDir)) {
      return false;
    }

    // Check if all expected chunks exist
    for (let i = 0; i < totalChunks; i++) {
      const chunkFileName = `${fileName}.part.${String(i).padStart(5, '0')}`;
      const chunkPath = path.join(chunkDir, chunkFileName);

      if (!fs.existsSync(chunkPath)) {
        return false;
      }
    }

    return true;
  }
}
