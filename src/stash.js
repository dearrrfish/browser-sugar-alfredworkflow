
import Preview from './preview'
import Action from './action'
import {
    getFromToBrowsers, getAppData, closeTab, readFromFile, writeToFile
} from './utils'

const STASH_FILE = 'stash.json'


class Stash extends Action {

    preview() {
        let preview = new Preview()
        let options = this.getQueryOptions()
        let { clone, dedupe, reverse } = this.getQueryFlags(true)

        let xml = this.previewOptionSelects(['browsers'], preview, options, ['from'])
        if (xml) { return xml }

        let fromBrowser
        try {
            [ fromBrowser ] = getFromToBrowsers(options.from)
        }
        catch (err) {
            return this.previewOptionSelectsError(err, preview, 'from')
        }

        const { tabs } = getAppData(fromBrowser, ['tabs'])
        if (!tabs || !tabs.length) {
            return this.previewOptionSelectsError(`No active tab in ${fromBrowser}`,
                                                  preview,
                                                  'from')
        }

        tabs.forEach(({ /*browser, browserType, */url, title, index, active }) => {

            const query = this.constructQueryString({
                options: { from: fromBrowser }
            })

            const item = {
                arg: query,
                autocomplete: query,
                title,
                subtitle: url,
                //subtitle_shift: ...,
                text_copy: `[${title}](${url})`,
                text_largetype: query
            }

            preview.add(item, 999)

        })

        return preview.buildXML()

    }

    run() {
        const { clone, forever } = this.getQueryFlags(true)
        let { from } = this.getQueryOptions({ allowEmpty: false, sanitize: true })
        const notes = this.getQueryNotes()

        let fromBrowser
        [ fromBrowser ] = getFromToBrowsers(from)

        let { tabs } = getAppData(fromBrowser, ['tabs'])
        if (!tabs || !tabs.length) { throw new Error(`No tab in front window of ${browser}.`) }

        // Encode non-latin characters to avoid error when writing to file
        tabs = tabs.map(({ url, title }) => [ encodeURIComponent(url), encodeURIComponent(title) ])
        const name = encodeURIComponent(notes || tabs[0][1] || 'Untitled Stash')
        const stash = {
            name,
            appName: fromBrowser,
            timestamp: new Date().getTime(),
            tabs
        }

        let stashList
        try {
            stashList = JSON.parse(readFromFile(STASH_FILE))
        }
        catch (err) {
            console.log(`Read file content error - ${STASH_FILE}: `, err)
        }
        stashList = stashList || []

        stashList.unshift(stash)
        writeToFile(stashList, STASH_FILE)

        if (!clone) { closeTab(fromBrowser, { closeWindow: true }) }

        return `Stashed tabs of ${fromBrowser}!`
    }

}


export default new Stash({
    name: 'stash',
    title: 'Stash Tabs',
    // opt: [ name, test, default, required, sanitizer]
    opts: [
        ['from', 1]
    ],
    // flag: [ name, test, default]
    flags: [
        ['clone', 1]
    ]
})


