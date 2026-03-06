import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,

    private readonly mailerService: MailerService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async register(createUserDto: CreateUserDto): Promise<any> {
    const { email, password, fullName } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      fullName,
      email,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    const token = this.jwtService.sign({
      id: savedUser.id,
      email: savedUser.email,
    });

    return {
      ...this.toResponseDto(savedUser),
      token,
    };
  }

  private toResponseDto(user: User): UserResponseDto {
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'fullName'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Compara
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.jwtService.sign({ id: user.id, email: user.email });

    return {
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new NotFoundException('Email no registrado');

    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);

    await this.userRepository.save(user);

    try {
      await this.sendRecoveryEmail(user.email, token);
    } catch (error) {
      console.error('Mailtrap falló, pero el token se guardó:', token);
    }

    return { message: 'Se ha enviado un correo de recuperación.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const cleanToken = token.trim();

    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: cleanToken },
    });

    if (!user) {
      throw new BadRequestException('El link es inválido o ha expirado.');
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('El link es inválido o ha expirado.');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepository.save(user);
    return { message: 'Contraseña actualizada correctamente' };
  }

  async sendRecoveryEmail(email: string, token: string) {
    const url = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Restablecer contraseña - DepurApp',
        html: `
          <div style="font-family: sans-serif; background-color: #090812; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px;">
            <h1 style="color: #7c3aed; margin-bottom: 20px;">DepurApp</h1>
            <p style="font-size: 16px; color: #9ca3af;">Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
            <div style="margin: 30px 0;">
              <a href="${url}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px;">
                Restablecer Contraseña
              </a>
            </div>
            <p style="font-size: 12px; color: #4b5563;">Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        `,
      });
      console.log(`Email de recuperación enviado a: ${email}`);
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Sincronización de compatibilidad:
    const compatibilityMapping = {
      roleTarget: updateProfileDto.targetRole,
      yearsOfExperience: this.parseYears(updateProfileDto.yearsExperience),
    };

    // 2. Fusionar datos
    Object.assign(user, updateProfileDto, compatibilityMapping);

    // 3. Nueva lógica de validación de completitud
    user.profileCompleted = this.checkIfProfileIsActuallyComplete(user);

    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.toResponseDto(user);
  }

  private parseYears(years: string): number {
    if (!years) return 0;
    const match = years.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  private checkIfProfileIsActuallyComplete(user: User): boolean {
    const requiredFields = [
      user.location,
      user.seniority,
      user.targetRole,
      user.cvUrl,
      user.workPreference,
      user.englishLevel,
      user.stack && user.stack.length > 0,
      user.consentToShareData === true,
    ];

    return requiredFields.every((field) => !!field);
  }
}
