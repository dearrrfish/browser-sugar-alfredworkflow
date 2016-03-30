
import Preview from './preview'
import Action from './action'
import { getFromToBrowsers, getAppData, openUrl, closeTab } from './utils'


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
                //subtitle_shift: ...,
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

        const { url, title } = getAppData(from, ['url', 'title'], { index })
        openUrl(url, to, { dedupe })
        if (!clone) { closeTab(from, { index }) }

        return `${from} >> ${to} | ${title}`

    }

}


export default new Switcher({
    name: 'switch',
    title: 'Switch Browser',
    // opt: [ name, test, default, required, sanitizer]
    opts: [
        ['from', 1],
        ['to', 1],
        ['index', 1, null, false, Number.parseInt]
    ],
    // flag: [ name, test, default]
    flags: [
        ['clone', 1],
        ['dedupe', 1, true],
        ['reverse', 1]
    ]
})


