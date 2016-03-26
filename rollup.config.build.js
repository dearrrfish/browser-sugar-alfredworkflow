import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'


export default {
    entry: 'src/main.js',
    format: 'cjs',
    plugins: [
        babel({
            exclude: 'node_modules/**',
            presets: 'es2015-rollup',
            plugins: [ 'transform-object-assign' ]

        }),
        uglify()
    ],
    dest: 'dist/main.min.js'
}
