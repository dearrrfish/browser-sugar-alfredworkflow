
import browserSwitch from './browser-switch'
import copyData from './copy-data'
import openLink from './open-link'
import { stashTabs } from './stash'

run(false)  // rollup build hack

// `run` applet
function run(argv) {
    if (argv === false) { return }
    argv = argv.join(' ')
    const actions = parseArgv(argv)
    console.log (JSON.stringify(actions))

    let resp = ''
    actions.every(([ name, options ]) => {
        try {
            switch (name) {
                case 'switch': resp = browserSwitch(options); break;
                case 'copy'  : resp = copyData(options); break;
                case 'open'  : resp = openLink(options); break;
                case 'stash' : resp = stashTabs(options); break;
                default: resp = `Unknown action - ${name}`; return false;
            }
            return true
        }
        catch (err) {
            console.log(`${err.toString()} [${err.line}:${err.column}] ${err.stack}`)
            resp = err.message || err
            return false
        }
    })

    return resp
}

// ================================================================================================

// argv {string}
function parseArgv(argv = '', delimiter = '&') {
    //console.log(argv, delimiter)
    const qs = argv.split(delimiter)
    const actions = qs.map(q => {
        q = q.trim();
        const params = q.split(/\s+/)
        return parseAction(params)
    });

    return actions
}


function parseAction([ name, ...opts ]) {
    // sanitize action name
    if      (/^sw(itch)?$/i.test(name))  { name = 'switch' }
    else if (/^co?py?$/i.test(name))     { name = 'copy' }
    else if (/^op(en)?$/i.test(name))    { name = 'open' }
    else if (/^s(ta)?sh??$/i.test(name)) { name = 'stash' }
    else                                 { name = name.toLowerCase() }

    const options = {
        // swtich tab & open url related
        clone: false,       // do not close original tab in front browser
        dedupe: false,      // do not duplicate open new tab if exists in target browser
        reverse: false,     // reverse flow from target to front
        // copy tab information related
        clips: new Set(['url', 'title', 'selection'])
    }

    const flags = new Set()
    const clips = new Set()
    opts.forEach(p => {
        if      (/^c(lone)?$/i.test(p))   { flags.add('clone') }
        else if (/^de?d(upe)?$/i.test(p)) { flags.add('dedupe') }
        else if (/^re(verse)?$/i.test(p)) { flags.add('reverse') }

        else if (/^url$/i.test(p))        { clips.add('url') }
        else if (/^title$/i.test(p))      { clips.add('title') }
        else if (/^selection$/i.test(p))  { clips.add('selection') }
        else if (/^tabs$/i.test(p))       { clips.add('tabs') }

        else { flags.add(p.toLowerCase()) }

    });

    flags.forEach(f => options[f] = true);
    if (clips.size) { options.clips = clips }

    return [ name, options ]

}

