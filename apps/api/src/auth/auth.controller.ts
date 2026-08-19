import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '@lms/shared';
import { LoginDto } from './dto/login.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto): Promise<ApiResponse> {
    const result = await this.authService.login(body.email);
    return { success: true, message: 'Login successful', data: result };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<ApiResponse> {
    const dbUser = await this.authService.getUserById(user.id);
    return { success: true, message: 'User retrieved', data: dbUser };
  }
}
