import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string; user: Partial<User> }> {
    try {
      console.log('Register attempt:', { email: registerDto.email });
      const { email, password } = registerDto;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        console.log('Registration failed: User already exists');
        throw new UnauthorizedException('User with this email already exists');
      }

      // Hash password
      console.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      console.log('Creating user...');
      const user = this.userRepository.create({
        email,
        password: hashedPassword,
        role: UserRole.User,
      });

      console.log('Saving user to database...');
      const savedUser = await this.userRepository.save(user);
      console.log('User saved successfully:', savedUser.id);

      // Generate JWT
      console.log('Generating JWT token...');
      const payload = {
        sub: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
      };
      const access_token = this.jwtService.sign(payload);
      console.log('JWT token generated successfully');

      // Return user without password
      const { password: _, ...userWithoutPassword } = savedUser;

      return {
        access_token,
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; user: Partial<User> }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

