
ObjC.import('Foundation')

const USER_HOME_FOLDER = ObjC.unwrap($.NSHomeDirectory())
const WORKFLOW_CONFIG_FOLDER = `${USER_HOME_FOLDER}/.config/bs-alfredworkflow`

const SAFARI_LIST = ['Safari', 'Webkit']
const CHROME_LIST = ['Google Chrome', 'Google Chrome Canary', 'Chromium']

function isSafari(name) { return SAFARI_LIST.indexOf(name) !== -1 }
function isChrome(name) { return CHROME_LIST.indexOf(name) !== -1 }

const SystemEvents = Application('System Events')
SystemEvents.includeStandardAdditions = true
const frontmostApp = () => SystemEvents.processes.whose({ frontmost: true })[0].name()

const FileManager = $.NSFileManager.defaultManager

// ================================================================================================

function getDefaultBrowser() {
    let app = Application.currentApplication()
    try {
        app.includeStandardAdditions = true
    }
    catch (err) {
        app = Application('Finder')
        app.includeStandardAdditions = true
    }

    return app.doShellScript(
        "export VERSIONER_PERL_PREFER_32_BIT=yes;" +
        "perl -MMac::InternetConfig -le 'print +(GetICHelper \"http\")[1]'"
    )
}


function theClipboard(sth) {
    if (sth) { SystemEvents.setTheClipboardTo(sth) }
    return SystemEvents.theClipboard()
}


// propsIn: {appName}
function getApp(appName = frontmostApp(), { activate = false, appOnly = false} = {}) {
    let app = null
    try {
        app = Application(appName)
    }
    catch (err) {
        throw new Error(`Application ${appName} was not found.`)
    }

    app.includeStandardAdditions = true
    activate && app.activate()
    //activate ? (app.activate()) : (app.launch())

    if (appOnly) { return app }

    let windows, frontTab, title, url;
    try {
        windows = app.windows()
    }
    catch (err) {
        // Non-standard native app might not support, e.g. Neovim.app
        console.log(`Non-standard native app ${appName}}: ${err}`)
        return [app]
    }

    if (isSafari(appName)) {
        windows = windows.filter(win => win.document() !== undefined)
        if (windows.length) {
            frontTab = windows[0].currentTab()
            if (frontTab) { title = frontTab.name(); url = frontTab.url() }
        }
    }
    else if (isChrome(appName)) {
        if (windows.length) {
            frontTab = windows[0].activeTab()
            if (frontTab) { title = frontTab.title(); url = frontTab.url() }
        }
    }

    return [app, windows, frontTab, title, url]
}


function getAppData(appName, clips = new Set()) {
    const data = {}
    let [app, windows, frontTab, title, url] = getApp(appName)
    appName = app.name()
    if (!Array.isArray(windows) || !windows.length) {
        // Just return empty data instead when no active window detected,
        // or because it does not support standard suite
        return data
        //throw new Error(`No active window was found in ${appName}`)
    }

    clips = new Set(clips)

    // get title/name data
    if (clips.has('title')) {
        data.title = title || windows[0].name() || appName
    }

    // url for browsers
    if (clips.has('url')) { data.url = url }

    // selected text
    if (clips.has('selection')) {
        try {
            // do javascript trick to get selection text in browser tab
            if (frontTab) {
                const js = "''+getSelection()"
                if (isSafari(appName)) {
                    data.selection = app.doJavaScript(js, { in: frontTab })
                }
                else if (isChrome(appName)) {
                    data.selection = frontTab.execute({ javascript: js })
                }
            }

            else {
                // call keystroke `cmd + c` to copy text
                const clipboardBackup = theClipboard()
                SystemEvents.keystroke('c', { using: 'command down' })
                delay(0.1)  // wait 0.1s to let keystroke take effect
                data.selection = theClipboard()
                // TODO better way to detect selection over this buggy workaround
                if (data.selection === clipboardBackup) { data.selection = null }
                else { theClipboard(clipboardBackup) }
            }
        }
        catch (err) {
            throw new Error(`Unable to get selection in ${appName}`)
        }
    }

    // all tabs
    if (clips.has('tabs')) {
        if (isChrome(appName)) {
            data.tabs = windows[0].tabs().map(tab => [ tab.url(), tab.title() ] )
        }
        else if (isSafari(appName)) {
            data.tabs = windows[0].tabs().map(tab => [ tab.url(), tab.name() ] )
        }
        else {
            data.tabs = []
        }
    }

    return data
}


function closeTab(appName, { closeWindow = false } = {}) {
    const [app, windows, frontTab] = getApp(appName)
    appName = app.name()
    try {
        if (windows.length && closeWindow) { app.close(windows[0]) }
        else if (frontTab) { app.close(frontTab) }
        else { throw new Error(`${appName} is not a browser or not supported yet.`) }
    }
    catch (err) {
        throw new Error(`Unable to close tab in ${appName}`)
    }

}


function openUrl(url, target, { activate = true, dedupe = false, newTab = true, background = false } = {}) {
    url = validateUrl(url)
    if (!url) { throw new Error('No valid URL was detected.') }

    target = (isSafari(target) || isChrome(target)) ? target : getDefaultBrowser()
    let [app, windows, frontTab] = getApp(target, { activate: activate })
    let appName = app.name()

    // create new window if no valid ones
    if (!windows.length) {
        isSafari(target) ? app.Document().make() : app.Window().make()
        app.windows[0].tabs[0].url = url
        return
    }

    let exists = false

    if (dedupe) {
        windows.some((win) => {
            win.tabs().some((tab, i) => {
                // TODO more wise url match method
                if (tab.url() == url) {
                    exists = [win, tab, i + 1];
                    return true
                }

                return exists   // false
            })

            return exists   // false
        })
    }

    exists = exists || [windows[0]]
    let [win, tab, tabIndex] = exists

    if (!tab) {
        if (newTab) {
            tab = app.Tab({ url: url })
            tabIndex = win.tabs.push(tab)
        }
        else {
            frontTab && (frontTab.url = url)
        }
    }

    //if (!tab) { throw new Error(`Unable to create tab in ${appName}`) }

    if (!background) {
        if (isSafari(target)) {
            win.currentTab = tab
        }
        else if (isChrome(target) && tabIndex) {
            win.activeTabIndex = tabIndex
        }
    }

    // always bring window to front within app
    win.index = 1

    return [url, appName]
}


// http://forums.devshed.com/javascript-development-115/regexp-to-match-url-pattern-493764.html
// https://github.com/ttscoff/popclipextensions/blob/master/OpenURLS.popclipext/openurls.rb
function validateUrl(str, debug) {
    if (typeof str === 'string') {
        const re = new RegExp(
            '(?:(?:https?:\\/\\/))?' + // protocol
            '(localhost|' + // local host
            '(([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?' // fragment locater
            , 'i')

        const match = re.exec(str)
        if (debug) { console.log(match) }
        if (match && typeof match[0] === 'string') {
            return match[0]
        }
    }
    return null
}


//function strReplace(str, replacer) {
    //str = STRINGS[str] || str
    //if (typeof replacer === 'object') {
        //const {_prefix, _suffix} = replacer
        //if (_prefix) { str = `${_prefix} ${str}`; delete replacer._prefix }
        //if (_suffix) { str = `${str} ${_suffix}`; delete replacer._suffix }

        //for (let k in replacer) {
            //let p = new RegExp(`\\$\\{${k}\\}`, 'i')
            //str = str.replace(p, replacer[k])
        //}
    //}

    //return str
//}


function writeToFile(content, fileName, absoulte = false) {
    let path = fileName.substring(0, fileName.lastIndexOf('/'))
    fileName = fileName.substring(fileName.lastIndexOf('/') + 1)
    if (!absoulte) {
        if (path[0] !== '/') { path = '/' + path }
        path = WORKFLOW_CONFIG_FOLDER + path
    }

    // make sure target folder exists or created
    FileManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(
        path, true, {}, null
    )

    content = $.NSString.alloc.initWithUTF8String(JSON.stringify(content))
    content.writeToFileAtomically((path + '/' + fileName), true)
}

export {
    SAFARI_LIST, CHROME_LIST, isSafari, isChrome,
    SystemEvents, frontmostApp, theClipboard,
    getDefaultBrowser, getApp, getAppData,
    openUrl, validateUrl, closeTab,
    writeToFile
}
