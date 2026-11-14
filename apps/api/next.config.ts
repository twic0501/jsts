import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  transpilePackages: ['@paper-galaxy/core'], poweredByHeader: false,
  ...(process.env.JSTS_REVIEW_NEXT_DIST ? { distDir: '.local/data-review-next' } : {}),
  serverExternalPackages:['@huggingface/transformers','onnxruntime-node'],
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  turbopack: { root: path.resolve(process.cwd(), '../..') },
  async headers() { return [{ source: '/:path*', headers: [ {key:'X-Content-Type-Options',value:'nosniff'}, {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'}, {key:'X-Frame-Options',value:'DENY'} ] }]; }
};
export default config;
