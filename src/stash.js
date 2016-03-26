
import {
    frontmostApp, getBrowser,
    getAppData, closeTab, openUrl, validateUrl,
    readFromFile, writeToFile
} from './utils'

const STASH_FILE = 'stash.json'

function stashTabs({ clone, from, unknowns }) {
    from = from || frontmostApp()
    const browser = getBrowser(from)[0]

    if (!browser) {
        throw new Error(`${from} is not supported browser.`)
    }

    let { tabs } = getAppData(browser, ['tabs'])
    if (!tabs.length) { throw new Error(`No tab in front window of ${browser}.`) }

    // Encode non-latin characters to avoid error when writing to file
    tabs = tabs.map(([ url, title ]) => [ encodeURIComponent(url), encodeURIComponent(title) ])

    const stash = {
        name: (unknowns.length ? unknowns.join(' ') : 'Untitled Stash'),
        appName: browser,
        timestamp: new Date().getTime(),
        tabs
    }

    let stashList = []
    try {
        stashList = JSON.parse(readFromFile(STASH_FILE))
    }
    catch (err) {
        console.log(`Read file content error - ${STASH_FILE}: `, err)
    }

    stashList.push(stash)
    writeToFile(stashList, STASH_FILE)

    if (!clone) { closeTab(browser, { closeWindow: true }) }

    return `Stashed tabs of ${browser}!`
}


function openStash() {

}


function listStash() {

}


function searchStash() {

}


export { stashTabs, openStash, listStash, searchStash }
