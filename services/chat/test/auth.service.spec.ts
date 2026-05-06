import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  it('should sign a token for a valid email and password', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'demo@example.com',
          name: 'Demo',
          password: 'secret',
          role: 'user',
        }),
      },
    };
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    const service = new AuthService(prisma as any, jwtService as any);
    const result = await service.login('demo@example.com', 'secret');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'demo@example.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
      },
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'demo@example.com',
      username: 'Demo',
      role: 'user',
    });
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        email: 'demo@example.com',
        name: 'Demo',
        role: 'user',
      },
    });
  });

  it('should reject invalid credentials', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const jwtService = {
      sign: jest.fn(),
    };

    const service = new AuthService(prisma as any, jwtService as any);

    await expect(service.login('demo@example.com', 'wrong')).rejects.toThrow(
      '用户名或密码错误',
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});
