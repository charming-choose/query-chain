import { build as esbuild } from 'esbuild';
import path from 'node:path'

const config = {
  entryPoints: [ 'lib/index.ts', 'lib/plugins/index.ts'],
  platform: 'browser',
  target: 'es2018',
  bundle: false, // 依赖打包进最终结果中
  minify: true, // 开启压缩
  tsconfig: path.resolve('./tsconfig.json')
}

function build() {
  const filesPath = [
    {
      format: 'esm',
      entryPoints: ['lib/index.ts'],
      outfile: 'dist/index.js',
    },
    {
      format: 'esm',
      entryPoints: ['lib/plugins/index.ts'],
      outfile: 'dist/plugins/index.js',
    },
    {
      format: 'cjs',
      entryPoints: ['lib/index.ts'],
      outfile: 'dist/index.cjs',
    },
    {
      format: 'cjs',
      entryPoints: ['lib/plugins/index.ts'],
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
