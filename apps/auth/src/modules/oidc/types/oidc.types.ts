export interface AccessTokenPayload {
  scope: string; // 'openid email profile' 처럼 공백으로 이어 붙인 문자열
  client_id: string;
}
