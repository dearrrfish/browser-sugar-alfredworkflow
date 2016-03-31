
import Preview from './preview'
import Action from './action'
import {
    readFromFile, getApp, getAppData, theClipboard, logError, getTester
} from './utils'

const FORMATS_FILE = 'formats.json'

class Copier extends Action {

    preview() {
        const preview = new Preview()
        const options = this.getQueryOptions()

        // validate browser options
        let xml = this.previewOptionSelects(['frontmost', 'browsers'], preview, options, ['from'])
        if (xml) { return xml }

        // validate format preset options
        xml = this.previewOptionSelects(['textformat_presets'], preview, options, ['format'])
        if (xml) { return xml }

        let _app
        try {
            _app = getApp(options.from, { index: options.index })
        }
        catch (err) {
            logError(err)
            return this.previewOptionSelectsError(err, preview, 'from')
        }

        const [ app, windows, browserType, targetTab, targetTabIndex, title , url ] = _app
        const appName = app.name()

        // Source application is a browser
        if (browserType) {
            let tabs = []
            if (targetTab && options.index === targetTabIndex) {
                tabs = [targetTab]
            }
            else {
                tabs = getAppData(appName, ['tabs'], { source: _app }).tabs
            }

            if (!tabs || !tabs.length) {
                return this.previewOptionSelectsError(`No active tab in ${appName}`, preview, 'from')
            }

            tabs.forEach(({ url, title, index, active }) => {
                const query = this.constructQueryString({
                    options: { from: appName, index: index }
                })

                const item = {
                    arg: query,
                    autocomplete: query,
                    title,
                    subtitle: url,
                    subtitle_alt: `Copy data from all ${tabs.length} tabs.`,
                    text_copy: `[${title}](${url})`,
                    text_largetype: query,
                    icon: `browser_${browserType}.png`,
                    icon_fileicon: `/Applications/${appName}.app`
                }

                if (active) { item.title = '[ACTIVE] ' + item.title }
                item.title = `✄ ${item.title}`,

                preview.add(item, (active ? 0 : 999))

            })

        }
        // Other types
        else {
            const query = this.constructQueryString({
                options: { from: appName }
            })
            preview.add({
                arg            : query,
                autocomplete   : query,
                title          : `✄ ${title || appName}`,
                subtitle       : '',
                text_copy      : appName,
                text_largetype : query,
                icon_fileicon  : `/Applications/${appName}.app`
            })

        }

        return preview.buildXML()
    }

    run() {
        const { from, index, format } = this.getQueryOptions({ allowEmpty: false, sanitize: true })
        let clips = this.getQueryFlags()

        if (!clips.size) {
            return `No copy flag was given (${Object.keys(this.flags).join(' | ').toUpperCase()})`
        }

        // Predefined text styling
        let formatString
        if (format) {
            let formats
            try {
                formats = JSON.parse(readFromFile(FORMATS_FILE))
            }
            catch (err) {
                logError(err)
            }
            if (formats && formats[format]) {
                formatString = formats[format]
            }
        }

        if (index === 'all') {
            clips.delete('tabs')    // `tabs` flag is unavailable here
            const extraClips = new Set(['selection', 'markdown'].filter(f => clips.has(f)))
            clips = Array.from(clips)

            let { tabs } = getAppData(from, ['tabs'])
            tabs = tabs || []
            const text = tabs.map(({ url, title, index }) => {
                let data = { url, title }
                if (extraClips.size) {
                    const extraData = getAppData(from, extraClips, { index })
                    data = Object.assign(data, extraData)
                }

                return this.formatText(formatString, clips, data)

            }).join('\n')

            theClipboard(text)
            return `Copied ${clips.join(',').toUpperCase()} from all tabs in ${from}`

        }
        else {
            clips = Array.from(clips)
            const data = getAppData(from, clips, { index, stringify: true })
            const text = this.formatText(formatString, clips, data)

            theClipboard(text)
            return `Copied ${clips.join(',').toUpperCase()} from ${from}.`
        }


        return resp

    }

    formatText(formatString, clips = [], data = {}) {
        if (formatString) {
            const re = /##[\w]+##/ig
            return formatString.replace(/##[\w]+##/g, m => {
                m = m.slice(2, -2)
                return data[m] || ''
            })
        }
        else {
            return clips.map(type => data[type] || '').join('\n')
        }
    }

}


export default new Copier({
    name: 'copy',
    title: 'Super Copier',
    // opt: [ name, test, default, required, sanitizer]
    opts: [
        ['from', 'Source application to copy data from', 1],
        ['index', 'Tab index number if available', 1, null, false, ['all', Number.parseInt]],
        ['format', 'Preset text style when constructing copied data', 2]
    ],
    // flag: [ name, test, default]
    flags: [
        ['url', 'Copy URL', 1],
        ['title','Copy tab title or application name', 2],
        ['selection', 'Copy text of selection', 1],
        ['tabs', 'Copy tabs data', 2],
        ['markdown', 'Copy URL and title in Markdown format', 1]
    ]
})

