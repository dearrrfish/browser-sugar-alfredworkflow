
import {
    frontmostApp, isSafari, isChrome,
    getAppData, closeTab, openUrl, validateUrl,
    writeToFile
} from './utils'


function stashTabs({ clone }) {
    const appName = frontmostApp()
    if (!isSafari(appName) && !isChrome(appName)) {
        throw new Error(`${appName} is not supported browser.`)
    }

    const { tabs } = getAppData(appName, ['tabs'])
    if (!tabs.length) { throw new Error(`No tab in front window of ${appName}.`) }

    const stash = {
        appName,
        tabs,
        timestamp: new Date().getTime()
    }

    writeToFile(stash, `/stash/${appName}.json`)

    if (!clone) { closeTab(appName, { closeWindow: true }) }

    return `Stashed tabs of ${appName}!`
}


function openStash() {

}


function listStash() {

}


function searchStash() {

}


export { stashTabs, openStash, listStash, searchStash }
