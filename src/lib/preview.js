
import Items from './workflow'
import { getAllBrowsers, getApp, getTester, isTrue, readFromFile } from './utils'

const FORMATS_FILE = 'formats.json'

const PRESETS = {
    icons: {
        'error'          : 'error.png',

        'browser'        : 'browser.png',
        'browser_safari' : 'browser_safari.png',
        'browser_chrome' : 'browser_chrome.png',

        'action'         : 'icon.png',
        'action_switch'  : 'action_switch.png',
        'action_copy'    : 'action_copy.png',
        'action_open'    : 'action_open.png',
        'action_stash'   : 'action_stash.png',
        'action_unstash' : 'action_unstash.png',

        'actionflag_on'             : 'actionflag_on.png',
        'actionflag_off'            : 'actionflag_off.png',
        'actionflagvalue_checked'   : 'actionflagvalue_checked.png',
        'actionflagvalue_unchecked' : 'actionflagvalue_unchecked.png',

    },
    //titlePrefix: {
        //'error': '(；￣Д￣）',
    //}
}

class Preview extends Items {
    constructor(items, config) {
        super(items, config, PRESETS)
    }

    hasError() { return this.filter(item => item.get('_type', '').startsWith('error')).length > 0 }


    addOptionItems(types, action, filter, opt, data = {}) {
        types = Array.isArray(types) ? types : [types]
        types.forEach(type => {
            switch (type) {
                case 'frontmost'            : this.addFrontmostApp(action, filter, opt, 999); break
                case 'browsers'             : this.addBrowsers(action, filter, opt, 999); break

                //case 'actions'            : this.addActions(data.actions, filter, opt, 999); break
                case 'action_flags'         : this.addActionFlags(action, filter, opt, 999); break
                case 'action_flag_values'   : this.addActionFlagValues(action, data.flag, filter, opt, 999); break
                case 'action_options'       : this.addActionOptions(action, filter, opt, 999); break
                case 'action_option_value'  : this.addActionOptionValue(action, data.option, filter, opt, 999); break

                case 'textformat_presets'   : this.addTextFormatPresets(action, filter, opt, 999); break

            }
        })
    }


    addFrontmostApp(action, filter, opt, insertBefore) {
        try {
            let [ app, windows, browserType, targetTab, targetTabIndex, title, url ] = getApp()
            const appName = app.name()

            if (filter) {
                const fuzzyTest_1 = getTester('frontmostapp', 'fuzzy_i')
                const fuzzyTest_2 = getTester(appName, 'fuzzy_i')
                if (!fuzzyTest_1(filter) && !fuzzyTest_2(filter)) { return }
            }

            title = title || appName
            const subtitle = url || ''

            const override = this.getOverride(opt, 'frontmostapp')
            const item = {
                _type         : `app_frontmostapp`,
                uid           : `app_frontmost`,
                valid         : 'no',
                autocomplete  : action.constructQueryString(override),
                title         : `[FRONT: ${appName}] ${title}`,
                subtitle      : subtitle,
                icon_fileicon : `/Applications/${appName}.app`
            }

            this.add(item, insertBefore)

        }
        catch (err) {
            const override = this.getOverride(opt)
            this.addError(action, {
                _type        : 'error',
                autocomplete : action.constructQueryString(override),
                title        : 'Front app is not available.',
                subtitle     : err
            }, 999)
        }
    }

    addBrowsers(action, filter, opt, insertBefore) {
        const BROWSERS = getAllBrowsers()
        Object.keys(BROWSERS).forEach(b => {
            const firstBrowser = BROWSERS[b][0]
            if (filter) {
                const fuzzyTest = getTester(firstBrowser, 'fuzzy_i')
                if (!fuzzyTest(filter)) { return }
            }

            const override = this.getOverride(opt, firstBrowser)
            const item = {
                _type         : `browser_${b}`,
                uid           : `browser_${firstBrowser}`,
                valid         : 'no',
                autocomplete  : action.constructQueryString(override),
                title         : firstBrowser,
                icon_fileicon : `/Applications/${firstBrowser}.app`
            }

            this.add(item, insertBefore)
        })
    }


    //addActions(actions, filter, opt, insertBefore) {
        //actions.forEach(action => {
            //if (filter && !action.fuzzyTestName(filter)) { return }
            //const override = this.getOverride(opt, action.name)
            //this.add({
                //_type        : `action_${action.name}`,
                //uid          : `action_${action.name}`,
                //valid        : 'no',
                //autocomplete : action.constructQueryString(override),
                //title        : action.name,
                //subtitle     : action.title
            //}, insertBefore)
        //})
    //}


    addActionFlags(action, filter, opt, insertBefore) {
        for (let flag in action.flags) {
            const { nameTest, defaultValue, description, noset } = action.flags[flag]
            if (noset) { continue }
            if (filter && !nameTest(filter)) { continue }

            const override = this.getOverride(opt, flag)
            const _type = `actionflag_${flag}`
            const item = {
                _type,
                uid          : _type,
                valid        : 'no',
                autocomplete : action.constructQueryString(override),
                title        : flag,
                subtitle     : description || '',
                icon         : `actionflag_${isTrue(defaultValue) ? 'on' : 'off'}.png`,
            }

            this.add(item, insertBefore)
        }
    }


    addActionFlagValues(action, flag, filter, opt, insertBefore) {
        const { defaultValue, description } = action.flags[flag];
        ['on', 'off'].forEach(v => {
            if (filter) {
                const fuzzyTest = getTester(v, 'fuzzy_i')
                if (!fuzzyTest(filter)) { return }
            }
            const _type = `actionflagvalue_${v}`
            const query = action.constructQueryString(this.getOverride(opt, v))
            this.add({
                _type,
                //uid          : _type,
                arg          : query,
                //autocomplete : query,
                title        : v,
                subtitle     : description || '',
                icon         : `actionflagvalue_${isTrue(defaultValue) === isTrue(v) ? 'checked' : 'unchecked'}.png`
            }, insertBefore)
        })
    }


    addActionOptions(action, filter, opt, insertBefore) {
        for (let option in action.opts) {
            const { nameTest, defaultValue, description, noset } = action.opts[option]
            if (noset) { continue }
            if (filter && !nameTest(filter)) { continue }

            const _type = `actionoption_${option}`
            let override = this.getOverride(opt, option)

            const item = {
                _type,
                uid: _type,
                valid: 'no',
                autocomplete: action.constructQueryString(override),
                title: `${option} [${defaultValue || 'None'}]`,
                subtitle: description || '',
            }

            this.add(item, insertBefore)
        }
    }


    addActionOptionValue(action, option, filter, opt, insertBefore) {
        const optConfig = action.opts[option]

        if (typeof optConfig === 'object') {
            const {defaultValue, description} = optConfig
            const _type = 'actionoption_value'
            const item = {
                _type,
                uid: _type,
                arg: action.constructQueryString(),
                title: `${option}: ${filter}`,
                subtitle: `${description}: ${defaultValue || 'None'} (Current)`
            }

            //if (!filter) { item.valid = 'no' }

            this.add(item, insertBefore)
        }
        else {
            const query = action.constructQueryString({
                options: {set_key: ''},
                notes: ''
            })
            this.addError(action, {
                autocomplete: query,
                title: `Invalid option of '${option}' for ${action.name.toUpperCase()}`,
                subtitle: 'Press ENTER / TAB to choose from a list.'
            }, insertBefore)
        }
    }


    addTextFormatPresets(action, filter, opt, insertBefore) {
        let formats
        try {
            formats = JSON.parse(readFromFile(FORMATS_FILE))
        }
        catch (err) {
            console.log(err)
        }
        formats = formats || {}

        Object.keys(formats).forEach(f => {
            const formatString = formats[f]
            if (filter) {
                const tester = getTester(f, 'fuzzy_i')
                if (!tester(filter)) { return }
            }

            const _type = `textformat_${f}`
            const query = action.constructQueryString(this.getOverride(opt, f))
            this.add({
                _type,
                uid: _type,
                valid: 'no',
                autocomplete: query,
                title: f,
                subtitle: formatString.replace(/[\r\n]/g, '⏎'),
                //icon: 'textformat.png'
            }, insertBefore)
        })

        if (!this.length()) {
            const query = action.constructQueryString(this.getOverride(opt))
            this.addError(action, {
                autocomplete: query,
                title: `No matched text formatting preset was found for '${filter || ''}'`,
                subtitle: 'Press ENTER / TAB to choose from a list'
            })
        }
    }


    addError(action, props, insertBefore) {
        const serialized = action.serialize()
        const item = Object.assign({
            _type     : `error_${action.name}`,
            valid     : 'no',
            title     : 'You\'ve caught by an error monkey!',
            subtitle  : serialized,
            text_copy : serialized,
        }, props)

        item.subtitle_cmd = item.subtitle_cmd || item.text_copy
        item.text_largetype = item.text_largetype || item.subtitle_cmd

        this.add(item, insertBefore)
    }


    getOverride(opt, value = '') {
        const options = {}
        if (opt) { options[opt] = value; return { options } }
        else { return {} }
    }

}


export default Preview
