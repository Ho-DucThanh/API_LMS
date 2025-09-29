import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsJWT, IsNotEmpty, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'JWT reset token from email link' })
  @IsNotEmpty()
  @IsJWT()
  token: string;

  @ApiProperty({ example: 'newStrongPass123' })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
