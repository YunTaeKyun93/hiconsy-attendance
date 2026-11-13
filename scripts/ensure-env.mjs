// .env가 없으면 .env.example을 복사하고 JWT_SECRET을 무작위 값으로 채운다.
// 이미 있는 .env에 JWT_SECRET이 없거나 비어 있으면 그 줄만 채운다. 다른 값은 건드리지 않는다.
// Windows에서도 동작하도록 Node로 작성.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const target = join(root, '.env');

const created = !existsSync(target);
let content = readFileSync(created ? join(root, '.env.example') : target, 'utf8');

const secretLine = /^JWT_SECRET=(.*)$/m;
const match = secretLine.exec(content);
const secret = `JWT_SECRET=${randomBytes(48).toString('base64url')}`;
let filledSecret = false;

if (!match) {
  content = `${content.replace(/\s*$/, '')}${EOL}${secret}${EOL}`;
  filledSecret = true;
} else if (match[1].trim() === '') {
  content = content.replace(secretLine, secret);
  filledSecret = true;
}

if (created || filledSecret) writeFileSync(target, content);

console.log(created ? '.env.example을 .env로 복사했습니다.' : '.env 파일이 이미 있어 그대로 사용합니다.');
if (filledSecret) console.log('JWT_SECRET을 무작위 값으로 채웠습니다.');
