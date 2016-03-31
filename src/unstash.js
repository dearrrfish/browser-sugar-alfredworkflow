
import Preview from './preview'
import Action from './action'
import {
    getBrowser, getFromToBrowsers, openUrls, getDefaultBrowser,
    readFromFile, writeToFile, getTester, logError, validateUrl
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
            logError(err)
        }

        let stashList
        try {
            stashList = JSON.parse(readFromFile(STASH_FILE))
        }
        catch (err) {
            logError(err)
        }
        stashList = stashList || []

        stashList.forEach(({ name, appName, timestamp, tabs }, i) => {
            name = decodeURIComponent(name)
            if (notes) {
               const tester = getTester(name, 'words_i')
               if (!tester(notes)) { return }
            }

            appName = toBrowser || appName
            const browserType = getBrowser(appName)[1]

            const query = this.constructQueryString({
                options: { index: i, to: appName },
                notes: ''
            })

            const text = tabs.map(
                ([url, title]) => `[${decodeURIComponent(title)}](${decodeURIComponent(url)})`
            ).join('\n')

            preview.add({
                arg: query,
                title: `${name} [${tabs.length}]`,
                subtitle: `Open ${tabs.length} stashed tabs in ${appName}`,
                text_copy: text,
                text_largetype: text,
                icon: `browser_${browserType}.png`,
                icon_fileicon: `/Applications/${appName}.app`
            })
        });

        if (!preview.length()) {
            const query = this.constructQueryString({
                options: { index: null },
                notes: ''
            })

            const title = stashList.length ? `No matched stash was found for '${notes}'` :
                                             'No stash was saved.'

            preview.addError(this, {
                autocomplete: query,
                title,
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
            logError(err)
        }

        let stashList
        try {
            stashList = JSON.parse(readFromFile(STASH_FILE))
        }
        catch (err) {
            logError(err)
        }
        stashList = stashList || []

        const stash = stashList[index]
        if (!stash) {
            throw new Error(`Invalid stash index number - ${index}`)
        }

        const { name, appName, timestamp, tabs } = stash
        const urls = []
        const target = toBrowser || appName
        const sameBrowser = target === appName

        tabs.forEach(([url]) => {
            url = decodeURIComponent(url)
            if (!sameBrowser) { url = validateUrl(url) }
            if (url) { urls.push(url) }
        })

        openUrls(urls, target, { newWindow: newwindow, noValidation: true })

        if (!clone) {
            stashList = stashList.slice(0, index).concat(stashList.slice(index + 1))
            writeToFile(stashList, STASH_FILE)
        }

        return `Unstashed ${urls.length} tabs in ${target} << [ ${decodeURIComponent(name)} ]`

    }

}


export default new UnStash({
    name: 'unstash',
    title: 'Un-Stash Tabs',
    // opt: [ name, test, default, required, sanitizer, description]
    opts: [
        ['to', 'Target browser to unstash tabs to.', 1],
        ['index', 'Tab index number', 1, null, false, Number.parseInt]
    ],
    // flag: [ name, test, default, description]
    flags: [
        ['clone', 'Do not delete stash record after unstashed', 1, false],
        ['newwindow', 'Unstash tabs into new window', 1, true],
        ['dedupe', 'Deduplicate URLs when openning in target window', 1]
    ]
})


