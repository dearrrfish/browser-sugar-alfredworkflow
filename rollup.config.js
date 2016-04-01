import babel from 'rollup-plugin-babel'

export default {
    format: 'cjs',
    plugins: [
        babel({
            exclude: 'node_modules/**',
            presets: 'es2015-rollup',
            plugins: [ 'transform-object-assign' ]
        })
    ],
}
