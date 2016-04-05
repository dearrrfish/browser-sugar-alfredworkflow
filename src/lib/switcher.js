
import Preview from './preview'
import Action from './action'
import { getFromToBrowsers, getAppData, openUrl, openUrls, closeTab } from './utils'


class Switcher extends Action {

    preview() {
        let preview = new Preview()
        let options = this.getQueryOptions()
        let { clone, dedupe, reverse } = this.getQueryFlags(true)

        let xml = this.previewOptionSelects(['browsers'], preview, options, ['from', 'to'])
        if (xml) { return xml }

        let fromBrowser, toBrowser
        try {
            [ fromBrowser, toBrowser ] = getFromToBrowsers(options.from, options.to, reverse)
        }
        catch (err) {
            return this.previewOptionSelectsError(err, preview, (fromBrowser ? 'to' : 'from'))
        }

        const { tabs } = getAppData(fromBrowser, ['tabs'])
        if (!tabs || !tabs.length) {
            return this.previewOptionSelectsError(`No active tab in ${fromBrowser}`,
                                                  preview,
                                                  (reverse ? 'to' : 'from'))
        }

        tabs.forEach(({ /*browser, */browserType, url, title, index, active }) => {

            const query = this.constructQueryString({
                options: {
                    from: fromBrowser,
                    to: toBrowser,
                    index: index
                }
            })

            const item = {
                _type: `browser_${browserType}`,
                arg: query,
                //autocomplete: query,
                title,
                subtitle: url,
                subtitle_alt: `Switch all tabs to ${toBrowser}`,
                text_copy: `[${title}](${url})`,
                text_largetype: query
            }

            // TODO active / specified given index
            if (active) { item.title = '[ACTIVE] ' + item.title }

            preview.add(item, (active ? 0 : 999))

        })

        return preview.buildXML()

    }

    run() {
        const { from, to, index } = this.getQueryOptions({ allowEmpty: false, sanitize: true })
        const { reverse, dedupe, clone } = this.getQueryFlags(true)

        let fromBrowser, toBrowser
        [ fromBrowser, toBrowser ] = getFromToBrowsers(from, to, reverse)

        if (index === 'all') {
            const { tabs } = getAppData(fromBrowser, ['tabs'])
            if (!tabs || !tabs.length) {
                throw new Error(`No tab in front window of ${fromBrowser}.`)
            }
            const urls = tabs.map(tab => tab.url)
            openUrls(urls, toBrowser, { noValidation: true })
            if (!clone) { closeTab(fromBrowser, { closeWindow: true })}

            return `${fromBrowser} >> ${toBrowser} | ${urls.length} tabs`

        }
        else {
            const { url, title } = getAppData(fromBrowser, ['url', 'title'], { index })
            openUrl(url, toBrowser, { dedupe })
            if (!clone) { closeTab(fromBrowser, { index }) }

            return `${fromBrowser} >> ${toBrowser} | ${title}`
        }

    }

}


export default new Switcher({
    name: 'switch',
    title: 'Switch Browser',
    // opt: [ name, description, test, default, required, sanitizer, noset]
    opts: [
        ['from', 'Source browser to switch tab(s) from', 1],
        ['to', 'Target browser to switch tabs(s) to', 1],
        ['index', 'Tab index number', 1, null, false, ['all', Number.parseInt], true]
    ],
    // flag: [ name, description, test, default, noset]
    flags: [
        ['clone', 'Keep original tab after switch', 1],
        ['dedupe', 'Deduplicate URL in target browser', 1, true],
        ['reverse', 'Reverse lookups of source and target browsers', 1]
    ]
})


