import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

@Controller() // The global prefix 'api' is already set in main.ts
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getCurrentUser(user.id);
  }

  @Public()
  @Post('refresh_token')
  async refresh(@Body() body: any) {
    return this.authService.refreshToken(body.refresh_token);
  }
}
