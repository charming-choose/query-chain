const { build: esbuild } = require('esbuild');
const path = require('path');

const config = {
  entryPoints: [ 'src/index.ts', 'src/plugins/index.ts'],
  platform: 'browser',
  target: 'es2018',
  bundle: true, // 依赖打包进最终结果中
  minify: true, // 开启压缩
  tsconfig: path.resolve(__dirname, './tsconfig.json'),
}

function build() {
  const filesPath = [
    {
      format: 'esm',
      entryPoints: ['src/index.ts'],
      outfile: 'dist/index.js',
    },
    {
      format: 'esm',
      entryPoints: ['src/plugins/index.ts'],
      outfile: 'dist/plugins/index.js',
    },
    {
      format: 'cjs',
      entryPoints: ['src/index.ts'],
      outfile: 'dist/index.cjs',
    },
    {
      format: 'cjs',
      entryPoints: ['src/plugins/index.ts'],
      outfile: 'dist/plugins/index.cjs',
    },
  ] 
  const buildFileConfigList = filesPath.map(entry => {
    return Object.assign({}, config, entry)
  })
  Promise.all(buildFileConfigList.map(config => {
    return esbuild(config)
  })).catch(() => {
    process.exit(1)
  })
}

build()
