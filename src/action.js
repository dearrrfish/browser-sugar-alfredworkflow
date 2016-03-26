
import Preview from './preview'
import { getUserDefaults, getTester } from './utils'

const TESTS = {
    __NO_MATCH  : /^$/,

    // actions
    SWITCH      : /^sw(itch)?$/i,
    COPY        : /^co?py?$/i,
    OPEN        : /^op(en)?$/i,
    STASH       : /^s(ta)?sh?$/i,
    UNSTASH     : /^uns(ta)?sh?$/i,

    // options
    FROM        : /^from$/i,
    TO          : /^to$/i,
    INDEX       : /^in?de?x$/i,
    CLONE       : /^cl(one)?$/i,
    DEDUPE      : /^de?d(upe)?$/i,
    REVERSE     : /^re(verse)?$/i,

    // flags
    URL         : /^url$/i,
    TITLE       : /^title$/i,
    SELECTION   : /^select(ion)?$/i,
    TABS        : /^tabs$/i

}


class Action {

    constructor({ name = '_unknown_', title = 'UNKNOWN', opts = [], flags = [] } = {}) {
        this.name = name
        this.title = title

        this.opts = {}
        opts.forEach(opt => {
            if (!Array.isArray(opt)) { opt = [opt] }
            let [ optName, optTest, defaultValue, required, sanitizer ] = opt
            let userDefaultValue = getUserDefaults(name, 'options', optName)
            defaultValue = userDefaultValue != null ? userDefaultValue : defaultValue
            this.opts[optName] = {
                nameTest: getTester(optName, optTest),
                defaultValue,
                required,
                sanitizer
            }
        })

        this.flags = {}
        flags.forEach(flag => {
            if (!Array.isArray(flag)) { flag = [flag] }
            let [ flagName, flagTest, defaultValue ] = flag
            let userDefaultValue = getUserDefaults(name, 'flags', flagName)
            defaultValue = userDefaultValue != null ? userDefaultValue : defaultValue
            this.flags[flagName] = {
                nameTest: getTester(flagName, flagTest),
                defaultValue
            }
        })

        this.query = {}

        // get testers
        this.testName = getTester(this.name, 'strict_i')
        this.fuzzyTestName = getTester(this.name, 'fuzzy_i')

    }

    serialize() {
        return JSON.stringify({
            name: this.name,
            title: this.title,
            flags: Array.from(this.getQueryFlags()),
            options: this.getQueryOptions({ allowEmpty: false }),
            notes: this.query.notes
        })
    }

    preview() {}
    run() {}

    getOptionName(name) {
        Object.keys(this.opts).some(k => {
            if (this.opts[k].nameTest(name)) {
                name = k
                return true
            }
            return false
        })
        return name
    }

    getQueryFlags(asObject) {
        const flags = new Set()
        const queryFlags = this.query.flags || new Set()
        //console.log(JSON.stringify(Array.from(queryFlags)))

        Object.keys(this.flags).forEach(f => {
            if (queryFlags.has('@' + f) || ((queryFlags.has(f) || this.flags[f].defaultValue) && !queryFlags.has('!' + f)) ) {
                flags.add(f)
            }
        })

        if (asObject) {
            const flagsObject = {}
            for (let f of flags) { flagsObject[f] = true }
            return flagsObject
        }

        return flags
    }

    getQueryOptions({ allowEmpty = true, sanitize = false } = {}) {
        const options = {}
        const queryOptions = this.query.options || {}
        Object.keys(this.opts).forEach(opt => {
            let value = queryOptions[opt]

            if (!allowEmpty && value === '') { value = null }

            if (value == null) { value = this.opts[opt].defaultValue }

            if (sanitize && typeof this.opts[opt].sanitizer === 'function') {
                value = this.opts[opt].sanitizer(value)
            }

            if (value != null) { options[opt] = value }

        })
        //console.log(JSON.stringify(options))
        return options
    }

    getQueryNotes() { return this.query.notes || '' }


    setQuery(qs) {
        let flags, options, notes
        if (typeof qs === 'string') {
            [ flags, options, notes] = this.parseQueryString(qs)
        }
        else if (Array.isArray(qs)) {
            [ flags, options, notes ] = qs
        }
        this.query = { options, flags, notes }
    }


    parseQueryString(qs = '') {
        let [ flags = '', options = '', ...notes ] = qs.split(';')
        notes = notes.join(';')

        // parse flags
        let queryFlags = new Set()
        flags = flags.trim().toLowerCase().split(/\s+/)
        const flagsToCatch = new Set(Object.keys(this.flags))

        while (flags.length && flagsToCatch.size) {
            let disable = false
            let flag = flags.pop()

            // deal with flag prefix: ! - force off, @ - force on
            let prefix = ''
            let [ head, ...rest ] = flag.split(/^[!@]/)
            if (rest.length) {
                prefix = head
                flag = rest.join('')
            }

            for (let f of flagsToCatch) {
                if (this.flags[f].nameTest(flag)) {
                    queryFlags.add(prefix + f)
                    flagsToCatch.delete(f)
                    break
                }
            }

        }

        // parse options
        let queryOptions = {}
        let str = options.trim()
        let lastOption = null, lastValues = []

        while (str.length) {
            const match = /\s*\w+\s*:\s*/.exec(str)

            // no substring was found, reach the end of `options` string
            if (!match) {
                let newOptions = {}
                // reading values for last option
                if (lastOption) {
                    lastValues.push(str)
                    newOptions[lastOption] = lastValues.join(' ')
                    // do not assign and reset lastOption state, will catch later
                }
                // although not followed by ':', it is the ending part of `options` string,
                // just assign new option properties
                else {
                    let opts = str.split(/\s+/)
                    opts.forEach(opt => newOptions[opt] = '')
                    lastOption = null
                    lastValues = []
                    this.assignQueryOptions(newOptions, queryOptions)
                }
                str = ''
            }

            else {
                if (lastOption) {
                    lastValues.push(str.slice(0, match.index).trim())
                    const newOptions = {}
                    newOptions[lastOption] = lastValues.join(' ')
                    this.assignQueryOptions(newOptions, queryOptions)
                    lastValues = []
                }

                lastOption = this.getOptionName(match[0].replace(/[\s:]/g, ''))
                str = str.slice(match.index + match[0].length)
            }
        }

        // catch un-assigned last option value
        if (lastOption) {
            const newOptions = {}
            newOptions[lastOption] = lastValues.join(' ')
            this.assignQueryOptions(newOptions, queryOptions)

            // last option should be valid for action
            if (Object.keys(this.opts).indexOf(lastOption) === -1) {
                lastOption = null
            }
        }

        return [ queryFlags, queryOptions, notes ]

    }

    assignQueryOptions(props, options = {}, overwrite) {
        Object.keys(props).forEach(k => {
            if (this.opts.hasOwnProperty(k) && (!options.hasOwnProperty(k) || overwrite)) {
                options[k] = props[k]
            }
        })
        return options
    }


    constructQueryString({ flags = [], options = {}, notes = '' } = {}, withActionName) {
        flags = new Set(flags)
        if (this.query.flags) { flags = new Set([ ...flags, ...this.query.flags ]) }
        flags = Array.from(flags).join(' ')

        options = Object.assign({}, this.query.options, options)
        options = Object.keys(options)
                        .map(prop => `${prop}:${options[prop]}`)
                        .join(' ')

        notes = ('' + notes) || this.query.notes

        let qs = [flags, options]
        if (notes) { qs.push(notes) }
        qs = qs.join(' ; ')

        if (withActionName) { qs = this.name + ' ' + qs }

        return qs
    }


    previewOptionSelects(types = [], preview, options, keys = []) {
        let xml = null
        types = Array.isArray(types) ? types : [types]
        keys = Array.isArray(keys) ? keys : [keys]

        for (let k of keys) {
            const v = options[k]
            if (typeof v === 'string') {
                preview.addOptionItems(types, this, v, k)

                if (preview.hasError()) { xml = preview.buildXML() }
                else {
                    const items = preview.get()
                    if (items.length === 0) {
                        const override = preview.getOverride(k)
                        preview.addError(this, {
                            autocomplete: this.constructQueryString(override),
                            title: `No supported app was found for: ${v}`,
                            subtitle: 'Press ENTER / TAB key to choose from a list.'
                        })
                        xml = preview.buildXML()
                    }
                    else if (items.length === 1) {
                        options[k] = items[0].get('_type').split('_')[1]
                        preview.clear()
                    }
                    else {
                        xml = preview.buildXML()
                    }
                }

            }

            if (xml) { break }
        }
        return xml
    }

    previewOptionSelectsError(err, preview, opt) {
        const override = preview.getOverride(opt)
        preview.addError(this, {
            autocomplete: this.constructQueryString(override),
            title: err,
            subtitle: 'Press ENTER / TAB key to choose from a list.'
        })
        return preview.buildXML()
    }

}


export default Action
