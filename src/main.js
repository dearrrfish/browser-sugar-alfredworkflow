
// `run` applet
function run(argv) {
    if (argv === false) { return }
    argv = argv.join(' ')
    const actions = parseArgv(argv)
    console.log (JSON.stringify(actions))

    let resp = ''
    actions.every(([ name, options ]) => {
        try {
            switch (name) {
                case 'switch': resp = browserSwitch(options); break;
                case 'copy'  : resp = copyData(options); break;
                case 'open'  : resp = openLink(options); break;
                //case 'stash' : resp = stashTabs(options); break;
                default: resp = `Unknown action - ${name}`; return false;
            }
            return true
        }
        catch (err) {
            console.log(`${err.toString()} [${err.line}:${err.column}] ${err.stack}`)
            resp = err.message || err
            return false
        }
    })

    return resp
}

// ================================================================================================

function browserSwitch({clone, dedupe, reverse}) {
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


function copyData({ clips } = {}) {
    const appName = frontmostApp()
    const data = getAppData(appName, clips)
    clips = Array.from(clips)
    const text = clips.map(type => data[type] || '').join('\n')
    theClipboard(text)

    return `Copied [${clips.toString().toUpperCase()}] from ${appName}`
}


function openLink({ dedupe }) {
    let appName = frontmostApp(),
        url = getAppData(appName, ['selection']).selection || theClipboard();

    [url, appName] = openUrl(url, appName, { dedupe: dedupe })

    return `Opened link in ${appName}: ${url}`
}


// ================================================================================================

// argv {string}
function parseArgv(argv = '', delimiter = '&') {
    //console.log(argv, delimiter)
    const qs = argv.split(delimiter)
    const actions = qs.map(q => {
        q = q.trim();
        const params = q.split(/\s+/)
        return parseAction(params)
    });

    return actions
}


function parseAction([ name, ...opts ]) {
    // sanitize action name
    if      (/^sw(itch)?$/i.test(name))  { name = 'switch' }
    else if (/^co?py?$/i.test(name))     { name = 'copy' }
    else if (/^op(en)?$/i.test(name))    { name = 'open' }
    else if (/^s(ta)?sh??$/i.test(name)) { name = 'stash' }
    else                                 { name = name.toLowerCase() }

    const options = {
        // swtich tab & open url related
        clone: false,       // do not close original tab in front browser
        dedupe: false,      // do not duplicate open new tab if exists in target browser
        reverse: false,     // reverse flow from target to front
        // copy tab information related
        clips: new Set(['url', 'title', 'selection'])
    }

    const flags = new Set()
    const clips = new Set()
    opts.forEach(p => {
        if      (/^c(lone)?$/i.test(p))   { flags.add('clone') }
        else if (/^de?d(upe)?$/i.test(p)) { flags.add('dedupe') }
        else if (/^re(verse)?$/i.test(p)) { flags.add('reverse') }

        else if (/^url$/i.test(p))        { clips.add('url') }
        else if (/^title$/i.test(p))      { clips.add('title') }
        else if (/^selection$/i.test(p))  { clips.add('selection') }
        else if (/^tabs$/i.test(p))       { clips.add('tabs') }

    });

    flags.forEach(f => options[f] = true);
    if (clips.size) { options.clips = clips }

    return [ name, options ]

}

// ================================================================================================

const SAFARI_LIST = ['Safari', 'Webkit']
const CHROME_LIST = ['Google Chrome', 'Google Chrome Canary', 'Chromium']

const SystemEvents = Application('System Events')
SystemEvents.includeStandardAdditions = true
const frontmostApp = () => SystemEvents.processes.whose({ frontmost: true })[0].name()

// ================================================================================================

function getDefaultBrowser() {
    return SystemEvents.doShellScript(
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

    let windows = app.windows(),
        frontTab, title, url;

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
    let [app, windows, frontTab, title, url] = getApp(appName)
    appName = app.name()
    if (!windows.length) { throw new Error(`No active window was found in ${appName}`) }

    const data = {}
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
    if (clips.has('tabs') && (isSafari(appName) || isChrome(appName))) {
        data.tabs = windows[0].tabs().map(tab => ({ url: tab.url(), title: tab.title() }))
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

function closeCurrentTab(appName) {
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


function isSafari(name) { return SAFARI_LIST.indexOf(name) !== -1 }
function isChrome(name) { return CHROME_LIST.indexOf(name) !== -1 }


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


