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

  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
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

    return this.toResponseDto(savedUser);
  }

  private toResponseDto(user: User): UserResponseDto {
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'fullName'], // Añade explícitamente los campos
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

    Object.assign(user, updateProfileDto);

    user.profileCompleted = this.isProfileComplete(user);

    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
  }

  private isProfileComplete(user: User): boolean {
    return (
      !!user.birth &&
      !!user.seniority &&
      user.yearsOfExperience !== null &&
      user.yearsOfExperience !== undefined &&
      user.yearsOfExperience >= 0 &&
      !!user.location &&
      !!user.roleTarget &&
      !!user.cvType &&
      !!user.cvUrl
    );
  }
}
