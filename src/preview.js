
import Items from './workflow'
import { BROWSERS, getApp, getTester } from './utils'


const PRESETS = {
    icons: {
        'error': 'error.png',
        'browser': 'browser.png',
        'browser_safari': 'browser_safari.png',
        'browser_chrome': 'browser_chrome.png',
    },
    titlePrefix: {
        'error': '(；￣Д￣）',
    }
}

class Preview extends Items {
    constructor(items, config) {
        super(items, config, PRESETS)
    }

    hasError() { return this.filter(item => item.get('_type', '').startsWith('error')).length > 0 }


    addOptionItems(types, action, filter, opt) {
        types = Array.isArray(types) ? types : [types]
        types.forEach(type => {
            switch (type) {
                case 'frontmost': this.addFrontmostApp(action, filter, opt, 999); break
                case 'browsers': this.addBrowsers(action, filter, opt, 999); break
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
                _type: `app_frontmostapp`,
                uid: `app_frontmost`,
                valid: 'no',
                autocomplete: action.constructQueryString(override),
                title: `[FRONT:${appName}] ${title}`,
                subtitle: subtitle
            }

            this.add(item, insertBefore)

        }
        catch (err) {
            const override = this.getOverride(opt)
            this.addError(action, {
                _type: 'error',
                autocomplete: action.constructQueryString(override),
                title: 'Front app is not available.',
                subtitle: err
            }, 999)
        }
    }

    addBrowsers(action, filter, opt, insertBefore) {
        Object.keys(BROWSERS).forEach(b => {
            const firstBrowser = BROWSERS[b][0]
            if (filter) {
                const fuzzyTest = getTester(firstBrowser, 'fuzzy_i')
                if (!fuzzyTest(filter)) { return }
            }

            const override = this.getOverride(opt, firstBrowser)
            const item = {
                _type: `browser_${firstBrowser}`,
                uid: `browser_${firstBrowser}`,
                valid: 'no',
                autocomplete: action.constructQueryString(override),
                title: firstBrowser
            }

            this.add(item, insertBefore)
        })
    }

    addError(action, props, insertBefore) {
        const serialized = action.serialize()
        const item = Object.assign({
            _type: `error_${action.name}`,
            valid: 'no',
            title: 'You\'ve caught by an error monkey!',
            subtitle: serialized,
            text_copy: serialized,
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
