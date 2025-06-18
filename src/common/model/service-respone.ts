import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponse<T> {
  @ApiProperty({ type: Boolean, description: 'Thành công hay thất bại' })
  success: boolean;

  @ApiProperty({ type: String, required: false, nullable: true })
  message?: string;

  @ApiProperty({ type: Number, example: HttpStatus.OK })
  statusCode: number;

  @ApiProperty({ required: false, nullable: true })
  data?: T;

  private constructor(
    success: boolean,
    statusCode: number,
    message?: string,
    data?: T,
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static success<T>(
    message?: string,
    data?: T,
    statusCode: HttpStatus = HttpStatus.OK,
  ): ServiceResponse<T> {
    return new ServiceResponse<T>(true, statusCode, message, data);
  }

  static failure<T>(
    message?: string,
    data?: T,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ): ServiceResponse<T> {
    return new ServiceResponse<T>(false, statusCode, message, data);
  }
}
