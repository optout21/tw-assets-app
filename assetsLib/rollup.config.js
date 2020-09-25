import typescript from 'rollup-plugin-typescript2';
import pkg from '../package.json';

export default {
    input: './assetsLib.ts',
    output: [
        {
            file: './dist/assetsLib.js',
            format: 'cjs',
        },
        {
            file: './dist/assetsLib.es.js',
            format: 'es',
        },
    ],
    inlineDynamicImports: true,
    external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
    ],
    plugins: [
        typescript({
            typescript: require('typescript'),
        }),
    ],
}
