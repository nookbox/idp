import { IsBoolean, IsOptional, IsString } from 'class-validator';

// 동의 화면(web)이 [허용]/[거부] 때 보내는 body
export class ConsentBodyDto {
  // 동의 화면 URL 의 쿼리 그대로 (client_id·scope·... + exp + sig)
  @IsString()
  oauth_query: string;

  @IsBoolean()
  accept: boolean;

  // 사용자가 체크한 scope. accept=true 일 때만 (요청 scope 안에서만 허용)
  @IsOptional()
  @IsString()
  scope?: string;
}

export type ConsentResDto = { url: string };
