import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type LoginUser = {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = (await (this.prisma as any).user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
      },
    })) as LoginUser | null;

    if (!user || user.password !== password) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.name ?? user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
