import { existsSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

const rootEnvPath = resolve(process.cwd(), '../../.env');
const packageEnvPath = resolve(process.cwd(), '.env');

if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, quiet: true });
}

if (existsSync(packageEnvPath)) {
  dotenv.config({ path: packageEnvPath, override: true, quiet: true });
}
