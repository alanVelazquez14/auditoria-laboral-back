import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../common/enums/cloudinary/cloudinary.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  @Post('register')
  register(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.register(createUserDto);
  }

  @Patch(':id/profile')
  @UseInterceptors(FileInterceptor('cvFile'))
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    let cvUrl: string | undefined = undefined;
    if (file) {
      cvUrl = await this.cloudinaryService.uploadFile(file);
    }
    return this.usersService.updateProfile(id, {
      ...updateProfileDto,
      cvUrl: cvUrl || updateProfileDto.cvUrl,
    });
  }

  @Throttle({ default: { limit: 5, ttl: 600000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.usersService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }

  @Post('social-login')
  async socialLogin(
    @Body() body: { email: string; fullName: string; googleId: string },
  ) {
    return this.usersService.loginWithSocial(body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-cv')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.includes('pdf')) {
          return callback(new Error('Solo se permiten archivos PDF'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadCV(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    const user = req.user;

    return this.usersService.processCV(file, user);
  }
}
