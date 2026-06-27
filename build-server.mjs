import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'server.js',
  format: 'cjs',
  external: ['mysql2'],
  sourcemap: false,
  minify: true,
});

console.log('Server bundled to server.js');
