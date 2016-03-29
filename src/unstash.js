
import Preview from './preview'
import Action from './action'
import {
    frontmostApp, getFromToBrowsers, openUrls, readFromFile, writeToFile, getTester
} from './utils'

const STASH_FILE = 'stash.json'


class UnStash extends Action {

    preview() {
        let preview = new Preview()
        let options = this.getQueryOptions()
        let notes = this.getQueryNotes()

        let xml = this.previewOptionSelects(['browsers'], preview, options, ['to'])
        if (xml) { return xml }

        let toBrowser
        try {
            toBrowser = getFromToBrowsers(options.to, null, true)[1]
        }
        catch (err) {
            return this.previewOptionSelectsError(err, preview, 'to')
        }

        let stashList
        try {
            stashList = JSON.parse(readFromFile(STASH_FILE))
        }
        catch (err) {
            console.log(`Read file content error - ${STASH_FILE}: `, err)
        }
        stashList = stashList || []

        stashList.forEach(({ name, appName, timestamp, tabs }, i) => {
            name = decodeURIComponent(name)
            if (notes) {
               const tester = getTester(name, 'words_i')
               if (!tester(notes)) { return }
            }

            appName = toBrowser || appName
            const query = this.constructQueryString({
                options: { index: i, to: appName },
                notes: ''
            })

            preview.add({
                arg: query,
                autocomplete: query,
                title: name,
                subtitle: `Open ${tabs.length} stashed tabs in ${appName}`,
                text_largetype: query
            })
        });

        if (!preview.length()) {
            const query = this.constructQueryString({
                options: { index: null },
                notes: ''
            })
            preview.addError(this, {
                autocomplete: query,
                title: `No matched stash group was found for ${notes}`,
                subtitle: 'Press ENTER / TAB to search again.'
            })
        }

        return preview.buildXML()

    }

    run() {
        const { clone, dedupe, newwindow } = this.getQueryFlags(true)
        let { to, index = 0 } = this.getQueryOptions({ allowEmpty: false, sanitize: true })
        const notes = this.getQueryNotes()

        let toBrowser
        try {
            toBrowser = getFromToBrowsers(to, null, true)[1]
        }
        catch (err) {
            console.log(err)
        }

        let stashList
        try {
            stashList = JSON.parse(readFromFile(STASH_FILE))
        }
        catch (err) {
            console.log(`Read file content error - ${STASH_FILE}: `, err)
        }
        stashList = stashList || []

        const stash = stashList[index]
        if (!stash) {
            throw new Error(`Invalid stash index number - ${index}`)
        }

        const { name, appName, timestamp, tabs } = stash
        const urls = tabs.map(([url]) => decodeURIComponent(url))
        const target = toBrowser || appName
        openUrls(urls, target, { newWindow: newwindow, noValidation: true })

        if (!clone) {
            stashList = stashList.slice(0, index).concat(stashList.slice(index + 1))
            writeToFile(stashList, STASH_FILE)
        }

        return `Opened ${tabs.length} tabs in ${target} << [ ${decodeURIComponent(name)} ]`

    }

}


export default new UnStash({
    name: 'unstash',
    title: 'Un-Stash Tabs',
    // opt: [ name, test, default, required, sanitizer, description]
    opts: [
        ['to', 1],
        ['index', 1, null, false, Number.parseInt]
    ],
    // flag: [ name, test, default, description]
    flags: [
        ['clone', 1, false],
        ['newwindow', 1, true],
        ['dedupe', 1]
    ]
})


