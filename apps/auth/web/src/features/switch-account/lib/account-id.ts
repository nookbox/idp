// 도메인은 떼고 아이디만 (hong@example.com → hong)
export function accountId(email: string) {
  return email.split('@')[0];
}
