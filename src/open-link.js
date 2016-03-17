
import { frontmostApp, getAppData, theClipboard, openUrl } from './utils'


function openLink({ dedupe }) {
    let appName = frontmostApp(),
        url = getAppData(appName, ['selection']).selection || theClipboard();

    [url, appName] = openUrl(url, appName, { dedupe: dedupe })

    return `Opened link in ${appName}: ${url}`
}


export default openLink
