
import runner from './lib/runner'
import action from './lib/opener'

run(false)  // rollupjs build tool hack

//`run` applet
function run(argv = []) {
    if (argv === false) { return }
    return runner(action, argv)
}
