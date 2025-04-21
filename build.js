import { build as esbuild } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';

// 读取并解析 package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf-8'));

// 获取 dependencies 和 peerDependencies (如果存在)
const externalDependencies = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
];

const config = {
  // entryPoints 不再需要在这里指定，因为 filesPath 中会覆盖
  // entryPoints: [ 'lib/index.ts', 'lib/plugins/index.ts'],
  platform: 'browser',
  target: 'es2018',
  bundle: true, // 保持 bundle: true 以打包您自己的代码
  minify: true, // 开启压缩
  tsconfig: path.resolve('./tsconfig.json'),
  external: externalDependencies, // <--- 添加 external 选项
};

function build() {
  const filesPath = [
    {
      format: 'esm',
      entryPoints: ['lib/index.ts'],
      outfile: 'dist/index.js',
    },
    {
      format: 'cjs',
      entryPoints: ['lib/index.ts'],
      outfile: 'dist/index.cjs',
    }
  ];
  const buildFileConfigList = filesPath.map(entry => {
    // 合并基础配置和特定文件配置
    // 注意：Object.assign 会用后面的属性覆盖前面的同名属性
    // 所以 entry 中的 entryPoints 会覆盖 config 中的（如果之前有的话）
    return { ...config, ...entry };
  });

  Promise.all(buildFileConfigList.map(config => {
    return esbuild(config);
  })).catch((e) => {
    console.error("Build failed:", e); // 添加错误日志
    process.exit(1);
  });
}

build();
