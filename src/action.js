
import Preview from './preview'
import { readFromFile, writeToFile, userDefaults, getTester, isTrue } from './utils'


class Action {

    constructor({ name = '_unknown_', title = 'UNKNOWN', opts = [], flags = [] } = {}) {
        this.name = name
        this.title = title

        this.opts = {}
        opts.forEach(opt => {
            if (!Array.isArray(opt)) { opt = [opt] }
            let [ optName, description, optTest, defaultValue, required, sanitizer ] = opt
            let userDefaultValue = userDefaults([name, 'options', optName].join('.'))
            defaultValue = userDefaultValue != null ? userDefaultValue : defaultValue
            this.opts[optName] = {
                nameTest: getTester(optName, optTest),
                defaultValue,
                required,
                sanitizer,
                description
            }
        })

        // shared options to set defaults of action flags
        this.opts.set_flag = {
            nameTest: getTester('set_flag', 'same_i'),
        }
        this.opts.set_value = {
            nameTest: getTester('set_value', 'same_i'),
        }

        this.flags = {}
        flags.forEach(flag => {
            if (!Array.isArray(flag)) { flag = [flag] }
            let [ flagName, description, flagTest, defaultValue ] = flag
            let userDefaultValue = userDefaults([name, 'flags', flagName].join('.'))
            defaultValue = userDefaultValue != null ? userDefaultValue : defaultValue
            this.flags[flagName] = {
                nameTest: getTester(flagName, flagTest),
                defaultValue,
                description
            }
        })

        this.query = {}

        // get testers
        this.testName = getTester(this.name, 'strict_i')
        this.fuzzyTestName = getTester(this.name, 'fuzzy_i')

    }

    serialize() {
        return JSON.stringify({
            name    : this.name,
            title   : this.title,
            flags   : Array.from(this.getQueryFlags()),
            options : this.getQueryOptions({ allowEmpty : false }),
            notes   : this.query.notes
        })
    }

    preview() {}
    run() {}


    defaults() {
        const preview = new Preview()
        const options = this.getQueryOptions()
        options.set_flag = options.set_flag || ''
        options.set_value = options.set_value || ''

        let xml = this.previewOptionSelects(['action_flags'], preview, options, ['set_flag'])
        if (xml) { return xml }

        xml = this.previewOptionSelects(['action_flag_values'],
                                        preview,
                                        options,
                                        ['set_value'],
                                        { flag: options.set_flag })
        if (xml) { return xml }

        return preview.buildXML()
    }


    set() {
        const { set_flag, set_value } = this.getQueryOptions()
        if (!set_flag || !set_value) {
            throw new Error(
                `Incomplete options to set default value for ${this.name.toUpperCase()}`
            )
        }

        const value = userDefaults([[this.name, 'flags', set_flag].join('.'), isTrue(set_value)])

        if (value != null) {
            return `Turned ${set_value} the flag ${(this.name + '.' + set_flag).toUpperCase()} by default`
        }
        else {
            return ''
        }
    }


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

            if (sanitize) {
                let sanitizer = this.opts[opt].sanitizer
                if (!Array.isArray(sanitizer)) { sanitizer = [sanitizer] }
                sanitizer.some(s => {
                    if (value === s) { return true }
                    if (typeof s === 'function') { value = s(value); return true }
                    return false
                })
            }

            if (value != null) { options[opt] = value }

        })
        //console.log(JSON.stringify(options))
        return options
    }

    getQueryNotes() { return (this.query.notes || '').trim() }


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


    parseQueryString(qs = '', delimeter = ';') {
        let [ flags = '', options = '', ...notes] = qs.trim().split(delimeter)

        // overrides args
        let overrides = notes.length > 1 ? notes.pop() : ''

        // join notes string
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
                prefix = flag[0]
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


        // parse overrides
        if(overrides) {
            const [ ovrFlags, ovrOptions, ...ovrNotes ] = this.parseQueryString(overrides, '|')
            //console.log(JSON.stringify(ovrOptions))
            if (ovrFlags.size) {
                queryFlags = new Set([...queryFlags, ...ovrFlags])
            }
            if (Object.keys(ovrOptions).length) {
                queryOptions = this.assignQueryOptions(ovrOptions, queryOptions, true)
                //console.log(JSON.stringify(queryOptions))
            }
            if (ovrNotes.length) {
                notes = ovrNotes.join(' ')
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

        let qs = [flags, options, notes].join(' ; ')

        if (withActionName) { qs = this.name + ' ' + qs }

        return qs
    }


    previewOptionSelects(types = [], preview, options, keys = [], data = {}) {
        let xml = null
        types = Array.isArray(types) ? types : [types]
        keys = Array.isArray(keys) ? keys : [keys]

        for (let k of keys) {
            const v = options[k]
            if (typeof v === 'string') {
                preview.addOptionItems(types, this, v, k, data)

                if (preview.hasError()) { xml = preview.buildXML() }
                else {
                    const items = preview.get()
                    if (items.length === 0) {
                        const override = preview.getOverride(k)
                        preview.addError(this, {
                            autocomplete: this.constructQueryString(override),
                            title: `No valid option value was found for: ${v}`,
                            subtitle: 'Press ENTER / TAB key to choose from a list.'
                        })
                        xml = preview.buildXML()
                    }
                    else if (items.length === 1 && v !== '') {
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
        console.log(err)
        const override = preview.getOverride(opt)
        preview.addError(this, {
            autocomplete: this.constructQueryString(override),
            title: err.message,
            subtitle: 'Press ENTER / TAB key to choose from a list.',
            text_largetype: err.toString()
        })
        return preview.buildXML()
    }

}


export default Action
