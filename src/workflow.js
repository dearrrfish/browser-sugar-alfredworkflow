
const ATTRIBUTES = ['uid', 'arg', 'valid', 'autocomplete', 'type']
const ELEMENTS = [
    'title', 'subtitle', 'subtitle_shift', 'subtitle_fn', 'subtitle_ctrl', 'subtitle_alt',
    'subtitle_cmd', 'icon', 'icon_filetype', 'icon_fileicon', 'text_copy', 'text_largetype'
]

const DEFAULT_CONFIG = {
    autoSort: true,
}

function escapeXML(str) {
    return ('' + str).replace(/[<>&"']/g, c => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;'
    }[c]))
}

class Item {
    constructor(props) {
        this.props = {}
        this.set(props)
    }

    reset() { this.props = {} }
    get(key, defaultValue) {
        const value = key ? this.props[key] : this.props
        return value == null ? defaultValue : value
    }
    set(ps, value) {
        if (typeof ps === 'object') {
            Object.keys(ps).forEach(key => this.set(key, ps[key]) )
            return
        }

        if (value) { this.props[ps] = value }
        else { delete this.props[ps] }
    }

    buildXML() {
        const attributes = ATTRIBUTES.map(name => (
            this.props[name] !== undefined ? `${name}="${escapeXML(this.props[name])}"` : ''
        )).filter(attr => attr !== '').join(' ')

        const elements = ELEMENTS.map(e => {
            if (this.props[e] === undefined) { return '' }
            let attr = ''
            let [ tag, attrValue ] = e.split('_')
            if (attrValue !== undefined) {
                attr += ` ${(tag === 'subtitle') ? 'mod' : 'type'}="${attrValue}"`
            }
            return `<${tag}${attr}>${escapeXML(this.props[e])}</${tag}>`
        }).filter(elem => elem !== '').join('\n')

        return `<item ${attributes}>\n${elements}\n</item>`
    }
}


class Items {
    constructor(items = [], config = {}, presets = {}) {
        this.config = Object.assign({}, DEFAULT_CONFIG, config)
        this.presets = presets
        items = items.map(item => this.prepareItem(item))
        this.items = items.map(item => new Item(item))
    }

    prepareItem(item) {
        const [ _type, _subType ] = (item._type || '').split('_')

        // apply presets to item props
        Object.keys(this.presets).forEach(p => {
            const preset = this.presets[p]
            switch (p) {
                // apply icon
                case 'icons':
                    item.icon = item.icon || preset[item._type] || preset[_type]
                    break

                // prepare title
                case 'titlePrefix':
                    const titlePrefix = preset[item._type] || preset[_type]
                    if (titlePrefix) { item.title = titlePrefix + item.title }
                    break

            }
        })

        // config-specific
        // remove `uid` to disable alfred auto sort
        if (!this.config.autoSort) { delete item.uid }

        // type-specific
        switch (_type) {
            case 'error':
                item.valid = item.valid || 'no'
                item.title = item.title || 'You\'ve caught by an error monkey!'

                break
        }

        return item
    }

    length() { return this.items.length }
    get(i) { return i == null ? this.items : this.items[i] }
    set(i, item) { this.items[i] = new Item(this.prepareItem(item)) }
    clear() { this.items = [] }

    add(item, i = 0) {
        item = new Item(this.prepareItem(item))
        i = i > this.items.length ? this.items.length : i
        this.items = this.items.slice(0, i).concat(item, this.items.slice(i))
    }

    remove(i) {
        this.items = this.items.slice(0, i).concat(this.items.slice(i+1))
    }

    sort() { this.items.forEach(item => item.set('uid')) }

    filter(callback) { return this.items.filter(callback) }

    buildXML() {
        //console.log(JSON.stringify(this.items))
        const content = this.items.map(item => item.buildXML()).join('\n')
        return `<?xml version="1.0"?>\n<items>\n${content}\n</items>`
    }
}


export default Items
export { Item, Items, escapeXML }
