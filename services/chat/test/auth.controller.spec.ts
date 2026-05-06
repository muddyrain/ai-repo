import { AuthController } from '../src/auth/auth.controller';

describe('AuthController', () => {
  it('should call login with email and password', async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 'signed-token' }),
    };

    const controller = new AuthController(authService as any);
    const result = await controller.login({
      email: 'demo@example.com',
      password: 'secret',
    });

    expect(authService.login).toHaveBeenCalledWith(
      'demo@example.com',
      'secret',
    );
    expect(result).toEqual({ accessToken: 'signed-token' });
  });
});
