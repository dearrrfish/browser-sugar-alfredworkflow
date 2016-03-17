import { frontmostApp, getAppData, theClipboard } from './utils'

function copyData({ clips } = {}) {
    const appName = frontmostApp()
    const data = getAppData(appName, clips)
    clips = Array.from(clips)
    const text = clips.map(type => data[type] || '').join('\n')
    theClipboard(text)

    return `Copied [${clips.toString().toUpperCase()}] from ${appName}`
}


export default copyData

