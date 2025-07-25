import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('postcss').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
