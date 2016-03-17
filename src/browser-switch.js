
import {
    isSafari, isChrome, CHROME_LIST, SAFARI_LIST,
    frontmostApp, getAppData, openUrl, closeTab
} from './utils'


function browserSwitch({ clone, dedupe, reverse }) {
    let front = frontmostApp(),
        target = null

    if (isSafari(front)) { target = CHROME_LIST[0] }
    else if (isChrome(front)) { target = SAFARI_LIST[0] }
    else { throw new Error(`${front} is not supported browser.`); return }

    if (reverse) { [front, target] = [target, front] }

    let {url, title} = getAppData(front, ['url', 'title'])
    openUrl(url, target, { dedupe: dedupe })

    if (!clone) { closeTab(front) }

    return `${front} >> ${target} | ${title}`
}


export default browserSwitch
