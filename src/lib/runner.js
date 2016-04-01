
import Preview from './preview'

export default function (action, argv = []) {
    let resp = ''
    let [callType, ...qs] = argv.join(' ').split(/\s+/)

    try {
        qs = qs.join(' ')
        action.setQuery(qs)
        if (typeof action[callType] === 'function') {
            resp = action[callType]()
        }
        else {
            throw new Error `Unknown call type '${callType}' for '${action.name}'`
        }
    }
    catch (err) {
        console.log(err)
        resp = err.message || err
        if (['preview', 'defaults'].indexOf(callType) !== -1) {
            const preview = new Preview()
            preview.addError(action, {
                subtitle: resp
            })
            resp = preview.buildXML()
        }
    }

    return resp
}
