export interface AccessTokenPayload {
  scope: string; // 'openid email profile' 처럼 공백으로 이어 붙인 문자열
  client_id: string;
}

/** /authorize 에서 authorization code 를 발급할 때 넣는 값 */
export type IssueCodeInput = {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  nonce?: string;
  codeChallenge: string;
  authTime: Date;
};

/** refresh token 발급 입력. familyId 가 없으면 새 계열(code 교환), 있으면 물려받음(rotation) */
export type IssueRefreshTokenInput = {
  clientId: string;
  userId: string;
  scope: string;
  familyId?: string;
};
