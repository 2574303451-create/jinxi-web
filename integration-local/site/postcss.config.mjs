import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export default { plugins: { tailwindcss: { config: path.join(root,'tailwind.config.ts'), content: [root + '/components/**/*.{js,ts,jsx,tsx}', root + '/app/**/*.{js,ts,jsx,tsx}', root + '/integration-local/**/*.{ts,tsx}'] }, autoprefixer: {} } };
