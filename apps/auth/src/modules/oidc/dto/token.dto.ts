import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TokenRequestDto {
  // unset grant_type=authorization_code : "내가 방금 사용자의 로그인 동의를 얻어서 인가 코드(unset code )를 받아왔으니, 이 코드를 토큰으로 바꿔줘."라는 뜻
  @IsString()
  @IsOptional()
  grant_type?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @IsString()
  @IsOptional()
  code_verifier?: string;
}

export class TokenResDto {
  @IsString()
  access_token: string;

  @IsString()
  @IsOptional()
  refresh_token?: string;

  @IsString()
  token_type: 'Bearer';

  @IsNumber()
  expires_in: number;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  id_token?: string;
}
