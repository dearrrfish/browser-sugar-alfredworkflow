
import Preview from './preview'
// action instances
import switcher from './switcher'
import copier from './copier'
import opener from './opener'
import stash from './stash'
import unstash from './unstash'

const actions = [switcher, copier, opener, stash, unstash]

const search = function(name, fuzzy, props) {
    let found = name ? actions.filter(
        action => fuzzy ? action.fuzzyTestName(name) : action.testName(name)
    ) : (fuzzy ? actions : [])

    if (props) {
        found = found.map(action => {
            if (typeof props === 'string') { return action[props] }
            else if (Array.isArray(props)) { return props.map(prop => action[prop]) }
            else { return action }
        })
    }

    return found
}


//const preview = function(name) {
    //const list = search(name, true)
    //const items = list.map(action => ({
        //_type: `action_${action.name}`,
        //uid: `action_${action.name}`,
        //valid: 'no',
        //autocomplete: action.constructQueryString(),
        //title: action.title
    //}))

    //const preview = new Preview(items)
    //return preview.buildXML()

//}

export default { search/*, preview*/ }

