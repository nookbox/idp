import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// FSD 레이어를 위에서 아래 순서로 나열. 각 레이어는 자기보다 아래만 import 할 수 있다.
const LAYERS = ['app', 'views', 'widgets', 'features', 'entities', 'shared'];

// 슬라이스(도메인 단위 폴더)를 갖는 레이어. app 과 shared 는 세그먼트만 갖는다.
// 슬라이스가 있는 레이어는 같은 레이어끼리도 import 할 수 없다(슬라이스 간 격리).
const SLICED = ['views', 'widgets', 'features', 'entities'];

function layerConfig(layer) {
  const higher = LAYERS.slice(0, LAYERS.indexOf(layer));
  const sameLayer = SLICED.includes(layer) ? [layer] : [];
  const forbidden = [...higher, ...sameLayer];

  const patterns = [];

  if (forbidden.length > 0) {
    patterns.push({
      group: forbidden.map((l) => `@/${l}/**`),
      message: `레이어 규칙 위반: '${layer}' 는 ${forbidden.map((l) => `'${l}'`).join(', ')} 를 import 할 수 없습니다. import 는 항상 아래 레이어로만 향해야 합니다 (${LAYERS.join(' → ')}).`,
    });
  }

  // 아래 레이어라도 슬라이스 내부를 직접 찌르는 건 금지 — public API(index.ts)만 통과.
  const importableSlices = SLICED.filter((l) => !forbidden.includes(l));
  if (importableSlices.length > 0) {
    patterns.push({
      group: importableSlices.flatMap((l) => [`@/${l}/*/*`, `@/${l}/*/*/**`]),
      message:
        "public API 위반: 슬라이스 내부 파일 대신 슬라이스 루트를 import 하세요. 예) '@/features/verify-email/ui/verify-email-button' → '@/features/verify-email'",
    });
  }

  return {
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': ['error', { patterns }],
    },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...LAYERS.map(layerConfig),
]);

export default eslintConfig;
