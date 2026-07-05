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
    return this.authService.login(body.email, body.password, body.mfaToken);
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

  @Post('mfa/setup')
  async setupMfa(@CurrentUser() user: RequestUser) {
    return this.authService.setupMfa(user.id);
  }

  @Post('mfa/verify')
  async verifyMfa(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.authService.verifyAndEnableMfa(user.id, body.token);
  }

  @Post('mfa/disable')
  async disableMfa(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.authService.disableMfa(user.id, body.token);
  }
}
