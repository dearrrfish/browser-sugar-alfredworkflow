
import Preview from './preview'
import actions from './actions'
import { logError } from './utils'

run(false)  // rollupjs build hack

// `run` applet
function run(argv = []) {
    if (argv === false) { return }
    let resp = '' // Response output

    // Detect call type of running script from first argument
    let [ callType, actionName, ...qs ] = argv.join(' ').split(/\s+/)
    callType = callType.toLowerCase()
    actionName = actionName.toLowerCase()

    if (['preview', 'run', 'defaults', 'set'].indexOf(callType) === -1) {
        console.log(`Error: Unknown callType - ${callType}`)
    }

    // Get action name from next coming argument
    const [ action ] = actions.search(actionName)

    if (!action) {
        switch (callType) {
            case 'preview':
            case 'defaults':
                resp = actions.preview()
                break

            case 'run':
            case 'set':
                resp = `Error: No matched action was found for ${actionName}.\n` +
                       `Possible actions: ${actions.search(null, 'name').join(', ')}`
                break
        }
    }

    try {
        // Parse and set query object to action from query string
        qs = qs.join(' ')
        action.setQuery(qs)
        resp = action[callType]()
    }
    catch (err) {
        logError(err)
        resp = err.message || err
        if (callType === 'preview' || callType === 'defaults') {
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


