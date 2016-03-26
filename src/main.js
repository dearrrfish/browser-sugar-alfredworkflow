
import Preview from './preview'
import actions from './actions'

run(false)  // rollupjs build hack

// `run` applet
function run(argv = []) {
    if (argv === false) { return }
    let resp = '' // Response output

    // Detect call type of running script from first argument
    let [ callType, actionName, ...qs ] = argv.join(' ').split(/\s+/)
    callType = callType.toLowerCase()
    actionName = actionName.toLowerCase()

    if (callType !== 'preview' && callType !== 'run') {
        console.log(`Error: Unknown callType - ${callType}`)
    }

    // Get action name from next coming argument
    const [ action ] = actions.search(actionName)

    if (!action) {
        if (callType === 'preview') {
            resp = actions.preview()
        }
        else if (callType === 'run') {
            resp = `Error: No matched action was found for ${actionName}.\n` +
                   `Possible actions: ${actions.search(null, 'name').join(', ')}`
        }
        return resp
    }

    try {
        // Parse and set query object to action from query string
        qs = qs.join(' ')
        action.setQuery(qs)
        resp = action[callType]()
    }
    catch (err) {
        console.log(`${err.toString()} [${err.line}:${err.column}] ${err.stack}`)
        resp = err.message || err
        if (callType === 'preview') {
            const preview = new Preview()
            preview.addError(action, {
                //uid: `error_${actionName}`,
                //autocomplete: ''
                subtitle: resp
            })
            resp = preview.buildXML()
        }
        return resp
    }

    return resp
}


