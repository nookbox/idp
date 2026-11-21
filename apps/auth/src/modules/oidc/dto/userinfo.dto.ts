import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UserInfoResDto {
  @IsString()
  sub: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  email_verified?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  picture?: string;
}
