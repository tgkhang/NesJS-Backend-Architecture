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

    // Generate accessible URL
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
    const baseName = body.name || 'default';
    const uploadId = body.uploadId || 'default';
    const folderName = `${baseName}-${uploadId}`;

    console.log('Chunk upload:', {
      fileName,
      chunkIndex,
      totalChunks,
      folderName,
      uploadedChunks: files.length,
    });

    // Check if all chunks have been uploaded
    const allChunksUploaded = ChunkHelper.areAllChunksUploaded(
      fileName,
      totalChunks,
      folderName,
    );

    if (allChunksUploaded) {
      console.log(`All chunks received for ${fileName}, assembling...`);

      try {
        // Assemble chunks into final file
        const metadata: ChunkMetadata = {
          chunkIndex,
          totalChunks,
          fileName,
          fileSize,
          folderName,
        };

        const result = await ChunkHelper.assembleChunks(metadata);

        // Clean up chunk files
        ChunkHelper.cleanupChunks(fileName, folderName);

        const fileUrl = `/uploads/completed/${result.fileName}`;

        return {
          message: 'File uploaded and assembled successfully',
          status: 'completed',
          fileName: result.fileName,
          originalFileName: fileName,
          url: fileUrl,
          path: result.filePath,
          totalChunks,
          size: fileSize,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(
          `Failed to assemble file: ${errorMessage}`,
        );
      }
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

    const { fileName, folderName } = query;

    try {
      // Extract metadata from query or use defaults
      const metadata: ChunkMetadata = {
        fileName,
        folderName,
        chunkIndex: 0,
        totalChunks: 0,
        fileSize: 0,
      };

      // Assemble chunks into final file
      const result = await ChunkHelper.assembleChunks(metadata);

      // Clean up chunk files
      ChunkHelper.cleanupChunks(fileName, folderName);

      const fileUrl = `/uploads/completed/${result.fileName}`;

      return {
        message: 'File merged successfully',
        status: 'completed',
        fileName: result.fileName,
        originalFileName: fileName,
        url: fileUrl,
        path: result.filePath,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to merge file: ${errorMessage}`);
    }
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
}
