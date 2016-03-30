
import Preview from './preview'
import Action from './action'
import { getApp, getAppData, theClipboard, logError } from './utils'


class Copier extends Action {

    preview() {
        const preview = new Preview()
        const options = this.getQueryOptions()

        let xml = this.previewOptionSelects(['frontmost', 'browsers'], preview, options, ['from'])
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
        const { from, index } = this.getQueryOptions({ allowEmpty: false, sanitize: true })
        let clips = this.getQueryFlags()

        if (!clips.size) {
            return `No copy flag was given (${Object.keys(this.flags).join(' | ').toUpperCase()})`
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

                return clips.map(type => data[type] || '').join('\n')

            }).join('\n')

            theClipboard(text)

            return `Copied ${clips.join(',').toUpperCase()} from all tabs in ${from}`

        }
        else {
            clips = Array.from(clips)
            const data = getAppData(from, clips, { index, stringify: true })
            const text = clips.map(type => data[type] || '').join('\n')
            //console.log(JSON.stringify(data))
            theClipboard(text)

            return `Copied ${clips.join(',').toUpperCase()} from ${from}.`
        }

    }

}


export default new Copier({
    name: 'copy',
    title: 'Super Copier',
    // opt: [ name, test, default, required, sanitizer]
    opts: [
        ['from', 'Source application to copy data from', 1],
        ['index', 'Tab index number if available', 1, null, false, ['all', Number.parseInt]]
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

