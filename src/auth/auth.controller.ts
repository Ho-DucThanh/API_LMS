import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ServiceResponse } from 'src/common/model/service-respone';
import { ForgotPasswordDto } from './dto/password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ type: ServiceResponse })
  async register(@Body() dto: RegisterDto) {
    const newUser = await this.authService.register(dto);
    return ServiceResponse.success(
      'User registered successfully',
      {
        id: newUser.id,
        email: newUser.email,
      },
      HttpStatus.CREATED,
    );
  }

  @Post('register-teacher')
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiResponse({ type: ServiceResponse })
  async registerTeacher(@Body() dto: RegisterDto) {
    const newUser = await this.authService.registerTeacher(dto);
    return ServiceResponse.success(
      'Teacher registered successfully',
      {
        id: newUser.id,
        email: newUser.email,
      },
      HttpStatus.CREATED,
    );
  }

  @Post('login')
  @ApiConsumes('application/x-www-form-urlencoded', 'application/json')
  @ApiResponse({ type: ServiceResponse })
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('access_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });
    return ServiceResponse.success(
      'Login successful',
      { result: { token: result.token, user: result.user } },
      HttpStatus.OK,
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ type: ServiceResponse })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return ServiceResponse.success('Logout successful', null, HttpStatus.OK);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ type: ServiceResponse })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return ServiceResponse.success(
      'If the email exists, a password reset link has been sent',
      null,
      HttpStatus.OK,
    );
  }


  // @Post('refresh-token')
  // @UseGuards(JWTAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Refresh JWT token' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Token refreshed successfully',
  // })
  // async refreshToken(@Request() req) {
  //   const newToken = await this.authService.refreshToken(req.user.sub);
  //   return ServiceResponse.success(
  //     'Token refreshed successfully',
  //     { token: newToken },
  //     HttpStatus.OK,
  //   );
  // }
}
