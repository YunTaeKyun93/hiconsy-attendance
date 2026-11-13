// .env가 없으면 .env.example을 복사한다. Windows에서도 동작하도록 Node로 작성.
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const target = join(root, '.env');

if (existsSync(target)) {
  console.log('.env 파일이 이미 있어 그대로 사용합니다.');
} else {
  copyFileSync(join(root, '.env.example'), target);
  console.log('.env.example을 .env로 복사했습니다.');
}
