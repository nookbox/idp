-- better-auth 1.7.3: 계정 조회 키가 (issuer, account_id) 에서 1.6 과 같은 (provider_id, account_id) 로 되돌아갔다.
-- 새 버전은 issuer 를 쓰지 않으므로 NOT NULL 컬럼이 남아 있으면 가입이 전부 막힌다. 0003 에서 넣은 걸 걷어낸다.
DROP INDEX "account_issuer_accountId_uidx";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "issuer";