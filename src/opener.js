
import Preview from './preview'
import Action from './action'
import {
    getDefaultBrowser, getBrowser, getApp, getAppData, openUrl, validateUrl, theClipboard
} from './utils'


class Opener extends Action {

    preview() {
        let preview = new Preview()
        let options = this.getQueryOptions()
        //let { dedupe } = this.getQueryFlags(true)

        let xml = this.previewOptionSelects(['browsers'], preview, options, ['in'])
        if (xml) { return xml }

        let _app, appName
        try {
            _app = getApp()
            let [ app, /*windows*/, browserType ] = _app
            appName = app.name()
            options.in = options.in || getBrowser(browserType, null, getDefaultBrowser())[0]
        }
        catch (err) {
            console.log(`${err.toString()} [${err.line}:${err.column}] ${err.stack}`)
            const opt = appName ? null : 'in'
            return this.previewOptionSelectsError(err, preview, opt)
        }

        const text = getAppData(appName, ['selection'], { source: _app }).selection || theClipboard()
        const url = validateUrl(text)

        if (url) {
            const query = this.constructQueryString({ notes: url })
            const item = {
                arg: query,
                autocomplete: query,
                title: url,
                subtitle: `Open detected URL in ${options.in}`,
                text_copy: `[](${url})`,
                text_largetype: text,
                icon_fileicon: `/Applications/${options.in}.app`
            }
            preview.add(item)
            return preview.buildXML()
        }
        else {
            preview.addError(this, {
                title: 'No valid URL was detected.',
                subtitle: `Origin text: ${text}`,
                text_largetype: text
            })
        }

        return preview.buildXML()

    }

    run() {
        const { dedupe } = this.getQueryFlags(true)
        const options = this.getQueryOptions({ allowEmpty: false, sanitizer: true })

        let notes = this.getQueryNotes()
        notes = notes || getAppData(undefined, ['selection']).selection || theClipboard()
        console.log('notes: ', notes)

        let [ url, appName ] = openUrl(notes, options.in, { dedupe })

        return `Opened URL in ${options.in}: ${url}`
    }

}


export default new Opener({
    name: 'open',
    title: 'Smart Opener',
    // opt: [ name, test, default, required, sanitizer]
    opts: [
        ['in', 1]
    ],
    // flag: [ name, test, default]
    flags: [
        ['dedupe', 1, true]
    ]
})


