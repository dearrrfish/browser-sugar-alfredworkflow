
import Preview from './preview'
import Action from './action'
import { getApp, getAppData, theClipboard } from './utils'


class Copier extends Action {

    preview() {
        const preview = new Preview()
        const options = this.getQueryOptions()

        let xml = this.previewOptionSelects(['frontmost', 'browsers'], preview, options, ['from'])
        if (xml) { return xml }

        let appData
        try {
            appData = getApp(options.from, { index: options.index })
        }
        catch (err) {
            console.log(`${err.toString()} [${err.line}:${err.column}] ${err.stack}`)
            return this.previewOptionSelectsError(err, preview, 'from')
        }

        const [ app, windows, browserType, targetTab, targetTabIndex, title , url ] = appData
        const appName = app.name()

        // Source application is a browser
        if (browserType) {
            let tabs = []
            if (targetTab && options.index === targetTabIndex) {
                tabs = [targetTab]
            }
            else {
                tabs = getAppData(appName, ['tabs'], { appData }).tabs
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
                    //subtitle_shift: ...,
                    text_copy: `[${title}](${url})`,
                    text_largetype: query,
                    icon_fileicon: `${appName}.app`
                }

                if (active) { item.title = '[ACTIVE] ' + item.title }
                item.title = 'Copy << ' + item.title

                preview.add(item, (active ? 0 : 999))

            })

        }
        // Other types
        else {
            const query = this.constructQueryString({
                options: { from: appName }
            })
            preview.add({
                arg: query,
                autocomplete: query,
                title: `Copy << ${title || appName}`,
                subtitle: '',
                text_copy: appName,
                text_largetype: query
            })

        }

        return preview.buildXML()
    }

    run() {
        const { from, index } = this.getQueryOptions({ allowEmpty: false, sanitize: true })
        const clips = Array.from(this.getQueryFlags())

        const data = getAppData(from, clips, { index, stringify: true })
        const text = clips.map(type => data[type] || '').join('\n')
        console.log(JSON.stringify(data))
        theClipboard(text)

        return `Copied ${clips.join(',').toUpperCase()} from ${from}.`
    }

}


export default new Copier({
    name: 'copy',
    title: 'Super Copier',
    // opt: [ name, test, default, required, sanitizer]
    opts: [
        ['from', 1],
        ['index', 1, null, false, Number.parseInt]
    ],
    // flag: [ name, test, default]
    flags: [
        ['url', 1],
        ['title', 1, true],
        ['selection', 1],
        ['tabs', 2]
    ]
})

