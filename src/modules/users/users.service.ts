import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
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

    const token = this.jwtService.sign({ id: savedUser.id, email: savedUser.email });

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
    // Mapeamos los campos nuevos del Wizard a los campos "core" de la entidad
    // Esto evita que 'roleTarget' o 'yearsOfExperience' queden en null/0
    const compatibilityMapping = {
      roleTarget: updateProfileDto.targetRole, // Mapea backend/frontend
      yearsOfExperience: this.parseYears(updateProfileDto.yearsExperience),
    };

    // 2. Fusionar datos
    Object.assign(user, updateProfileDto, compatibilityMapping);

    // 3. Nueva lógica de validación de completitud
    user.profileCompleted = this.checkIfProfileIsActuallyComplete(user);

    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
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
      user.stack && user.stack.length > 0, // Que tenga al menos una tech
      user.consentToShareData === true, // Que haya aceptado términos
    ];

    return requiredFields.every((field) => !!field);
  }
}
