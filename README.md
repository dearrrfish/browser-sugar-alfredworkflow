## Browser Switcher for Alfred

Automation scripts of switching tabs between Safari/Chrome; copy tab information; open url from selection or clipboard, etc.

***Require OS X Yosemite+***

### Usage

Basic pattern: `bs <action> [option|flag]* (& <action> [option|flag]*)*`

#### Actions:

- `switch` or  `sw` - switch current tab to another browser
- `copy` or `cp` - copy tab/application data to clipboard
- `open` or `op` - open url from selected text of current application or the clipboard

#### Options:

- `clone` or `c` - keep original tab after switching, available for action `switch`
- `dedupe` or `dd` - jump to existing tab if url matched in target browser instead of creating new tab, available for action `switch` and `open`
- `reverse` or `re` - reverse front and target browsers for switching tabs, available for action `switch`

#### Flags:

- `url` - copy url of current tab to clipboard
- `title` - copy tab title or application name to clipboard
- `selection` - copy selection content/text of current application to clipboard
- default flags: `url title selection`

#### Actions flow:

Use `&` between commands to execute a sequence of actions.

#### Aliases:

- `bss` = `bs switch`
- `bsc` = `bs copy`
- `bso` = `bs open`

#### Examples:

```shell
# Switch current tab to another browser, keep original tab open, and check if any duplicated tab in target browser
bs switch clone dedupe

# Bring front tab of background browser to current browser
bs switch reverse

# Copy url and title only
bs copy url title
# => https://www.google.com/
# 	 Google

# Selection or clipboard: "hello world! https://google.com life begins blah blah..."
# Open url, and check duplicated tabs as well
bs open dedupe

# Copy url and selected text of current tab, then switch to another browser
bs copy url selection & switch dedupe
```

### Customization

1. Open **Alfred Preferences - Workflows**, find **Browser Switcher**.
2. Create a new flow taking any existing flow as example.
3. Modify **Action Script** content, adding default `action/options/flags` you would like.
   e.g. `osascript -l JavaScript main.js "switch clone dedupe {query}"`
4. Assign your preferred hotkey and keyword, and you are all set.

### Todo

- `stash` action to save/open multiple tabs at one time
- Allow to specify source and target browser
- Add delay and result validation between actions in command flow
- Firefox support
- Configurations of default options/flags

### Licences

MIT

Icons from http://dryicons.com/free-icons/