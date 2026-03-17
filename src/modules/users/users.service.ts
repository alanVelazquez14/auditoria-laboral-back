import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoginDto } from '../auth/dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { RoleCategory } from '../common/enums/role-category.enum';
import { AiService } from 'src/ai/ai.service';
import { extractTextFromPDF } from 'src/utils/pdf-extractor';
import { CvHistoryService } from '../cvHistory/cv-history.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,

    private readonly mailerService: MailerService,

    private readonly aiService: AiService,

    private readonly cvHistoryService: CvHistoryService,
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

    if (user.lockUntil && user.lockUntil > new Date()) {
      const diff = user.lockUntil.getTime() - Date.now();
      const minutes = Math.ceil(diff / 60000);
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutes} minutos.`,
      );
    }

    // Compara
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const attempts = await this.incrementFailedAttempts(user.id);
      // Si llega a 5 intentos, bloqueamos 10 min
      if (attempts >= 5) {
        await this.lockAccount(user.id, 10);
        throw new UnauthorizedException(
          'Demasiados intentos fallidos. Cuenta bloqueada por 10 minutos.',
        );
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.resetFailedAttempts(user.id);

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

  async findOrCreateSocialUser(data: {
    email: string;
    fullName: string;
    googleId: string;
  }) {
    let user = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (user) {
      return user;
    }

    const newUser = this.userRepository.create({
      email: data.email,
      fullName: data.fullName,
      password: bcrypt.hashSync(Math.random().toString(36), 10),
      roleTarget: RoleCategory.FULLSTACK,
    });

    return await this.userRepository.save(newUser);
  }

  async loginWithSocial(data: {
    email: string;
    fullName: string;
    googleId: string;
  }) {
    const user = await this.findOrCreateSocialUser(data);

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
    });

    return {
      message: 'Login social exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
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

    if (updateProfileDto.cvUrl && updateProfileDto.cvUrl !== user.cvUrl) {
      const history = user.cvHistory || [];

      history.push({
        url: updateProfileDto.cvUrl,
        name: 'Currículum actualizado',
        uploadedAt: new Date(),
      });

      user.cvHistory = history;
      user.cvUrl = updateProfileDto.cvUrl;
    }

    const compatibilityMapping = {
      roleTarget: updateProfileDto.targetRole,
      yearsOfExperience: this.parseYears(updateProfileDto.yearsExperience),
    };

    const { cvUrl, ...restOfDto } = updateProfileDto;

    Object.assign(user, restOfDto, compatibilityMapping);

    user.profileCompleted = this.checkIfProfileIsActuallyComplete(user);

    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
  }

  async processCV(file: Express.Multer.File, authUser: any) {
    if (!file || !file.buffer) {
      throw new Error('Archivo no recibido correctamente');
    }

    try {
      // 1. Buscamos al usuario para obtener su stack y validar existencia
      const user = await this.userRepository.findOne({
        where: { id: authUser.id },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // 2. Extraer texto del PDF
      const cvText = await extractTextFromPDF(file.buffer);

      // 3. Llamamos a la IA pasándole el stack del usuario
      const analysis = await this.aiService.analyzeCVWithATS(
        cvText,
        user.stack || [],
      );

      await this.cvHistoryService.createEntry(
        authUser.id,
        user.cvUrl ?? 'url_no_disponible',
        analysis,
      );

      // 4. PERSISTENCIA: Guardamos el análisis y la fecha en la DB
      await this.userRepository.update(authUser.id, {
        lastAnalysis: analysis,
        updatedAt: new Date(),
      });

      // 5. Retornamos el análisis al frontend
      return {
        message: 'Análisis completado con éxito',
        ...analysis,
      };
    } catch (error) {
      console.error('ERROR EN PROCESAMIENTO:', error);
      throw new Error('Error al procesar el CV: ' + error.message);
    }
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

  async incrementFailedAttempts(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      await this.userRepository.update(userId, {
        failedLoginAttempts: newAttempts,
      });
      return newAttempts;
    }
    return 0;
  }

  async lockAccount(userId: string, minutes: number) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + minutes);
    await this.userRepository.update(userId, { lockUntil });
  }

  async resetFailedAttempts(userId: string) {
    await this.userRepository.update(userId, {
      failedLoginAttempts: 0,
      lockUntil: null,
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'fullName',
        'failedLoginAttempts',
        'lockUntil',
      ],
    });
  }

  async canPerformDiagnostic(
    userId: string,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    const MAX_LIMIT = 5;
    const now = new Date();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      user.lastDiagnosticDate &&
      user.lastDiagnosticDate.toDateString() !== now.toDateString()
    ) {
      user.dailyDiagnosticCount = 0;
      await this.userRepository.save(user);
    }

    const remaining = MAX_LIMIT - user.dailyDiagnosticCount;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  }

  async incrementDiagnosticCount(userId: string) {
    await this.userRepository.update(userId, {
      dailyDiagnosticCount: () => '"dailyDiagnosticCount" + 1',
      lastDiagnosticDate: new Date(),
    });
  }
}
