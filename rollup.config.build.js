import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import { minify } from 'uglify-js'


export default {
    entry: 'src/main.js',
    format: 'cjs',
    plugins: [
        babel({
            exclude: 'node_modules/**',
            presets: 'es2015-rollup',
            plugins: [ 'transform-object-assign' ]

        }),
        uglify({
            compress: {
                dead_code: true,
                comparisons: true,
                unused: true
            }
        }, minify)
    ],
    dest: 'dist/main.min.js'
}
