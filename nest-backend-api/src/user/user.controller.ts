import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { storage, chunkStorage } from './oss';
import { ChunkHelper, ChunkMetadata } from './chunk.helper';
import * as path from 'path';
import * as fs from 'fs';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('new')
  register(@Body() registerUserDto: RegisterUserDto) {
    console.log('Register DTO:', registerUserDto);
    return this.userService.register(registerUserDto);
  }

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @Post('upload/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
      fileFilter: (req, file, cb) => {
        const extName = path.extname(file.originalname).toLowerCase();
        if (extName === '.jpg' || extName === '.jpeg' || extName === '.png') {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only .jpg, .jpeg, and .png files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    console.log('Uploaded file:', file);

    const fileUrl = `/uploads/avatar/${file.filename}`;

    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      path: file.path,
      url: fileUrl,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('upload/large-file')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: chunkStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit per chunk
      fileFilter: (req, file, cb) => {
        const extName = path.extname(file.originalname).toLowerCase();
        if (extName === '.jpg' || extName === '.jpeg' || extName === '.png') {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only .jpg, .jpeg, and .png files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadLargeFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body()
    body: {
      name?: string;
      chunkIndex?: string;
      totalChunks?: string;
      fileName?: string;
      fileSize?: string;
      uploadId?: string;
    },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const chunkIndex = parseInt(body.chunkIndex || '0');
    const totalChunks = parseInt(body.totalChunks || '1');
    const fileName = body.fileName || files[0].originalname;
    const fileSize = parseInt(body.fileSize || '0');
    const folderName = `${body.name || 'default'}-${body.uploadId || 'default'}`;

    console.log('Chunk upload:', {
      fileName,
      chunkIndex,
      totalChunks,
      folderName,
    });

    // Move temp file to proper location with correct chunk name
    this.moveChunkToTarget(files[0], fileName, chunkIndex, folderName);

    // Check if all chunks uploaded
    const allChunksUploaded = ChunkHelper.areAllChunksUploaded(
      fileName,
      totalChunks,
      folderName,
    );

    if (allChunksUploaded) {
      console.log(`All chunks received for ${fileName}, assembling...`);

      const metadata: ChunkMetadata = {
        chunkIndex,
        totalChunks,
        fileName,
        fileSize,
        folderName,
      };

      const result = await ChunkHelper.assembleChunks(metadata);

      // Clean up chunk files (commented out to keep chunks)
      // ChunkHelper.cleanupChunks(fileName, folderName);

      return {
        message: 'File uploaded and assembled successfully',
        status: 'completed',
        fileName: result.fileName,
        originalFileName: fileName,
        url: `/uploads/completed/${result.fileName}`,
        path: result.filePath,
        totalChunks,
        size: fileSize,
      };
    }

    // Return progress for intermediate chunks
    return {
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      status: 'uploading',
      chunkIndex,
      totalChunks,
      fileName,
      progress: Math.round(((chunkIndex + 1) / totalChunks) * 100),
    };
  }

  @Get('merge/file')
  async mergeFile(
    @Query()
    query: {
      fileName?: string;
      folderName?: string;
    },
  ) {
    if (!query.fileName || !query.folderName) {
      throw new BadRequestException(
        'fileName and folderName are required parameters',
      );
    }

    const metadata: ChunkMetadata = {
      fileName: query.fileName,
      folderName: query.folderName,
      chunkIndex: 0,
      totalChunks: 0,
      fileSize: 0,
    };

    const result = await ChunkHelper.assembleChunks(metadata);

    // Clean up chunk files (commented out to keep chunks)
    // ChunkHelper.cleanupChunks(query.fileName, query.folderName);

    return {
      message: 'File merged successfully',
      status: 'completed',
      fileName: result.fileName,
      originalFileName: query.fileName,
      url: `/uploads/completed/${result.fileName}`,
      path: result.filePath,
    };
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  // Helper method to move chunk from temp to target directory
  private moveChunkToTarget(
    file: Express.Multer.File,
    fileName: string,
    chunkIndex: number,
    folderName: string,
  ): void {
    const targetDir = path.join(process.cwd(), 'uploads', 'chunks', folderName);
    const chunkFilename = `${fileName}.part.${String(chunkIndex).padStart(5, '0')}`;
    const targetPath = path.join(targetDir, chunkFilename);

    fs.mkdirSync(targetDir, { recursive: true });
    fs.renameSync(file.path, targetPath);

    console.log(`Moved chunk ${chunkIndex} to: ${targetPath}`);
  }
}
