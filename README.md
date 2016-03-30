## Browser Sugar Workflow for Alfred 2

> Workflow scripts playing with browser tabs, and more...
> ***Require OS X Yosemite+***



### Base Syntax

**Actions:** **b**<action> [*flags*] **;** [*option* **:** *value*]; [*notes*|*extras*...]

**Settings:** **bset** <action> ; **set_flag:** *flag* **set_value:** *value*

- <action> - keyword to trigger action, e.g. `switch`, `unstash`
- *flags* - on/off value, e.g. `clone`
  - You can prepend prefix to flags to override default settings
    - `@` - force flag being **on** state
    - `!` - force flag being **off** state
    - priority: `@` > `!` > *no prefix*

- *option: value* - key-value pairs of options, e.g. `from: Google Chrome`
- *notes | extras* - additional text data, e.g. `Stash Group Name on Feb 29`


---




### Switch Tabs

Switch tabs between supported browsers.

#### Syntax: 

Action: `bswitch [clone|dedupe|reverse]; [from:|to:|index:]`

Set Default Flags: `bset switch`

#### Flags:

- ***clone*** - Keep original tab(s) after switching
- ***dedupe*** - Deduplicate URL in target browser before opening a new tab
- ***reverse*** - Reverse lookups of source and target browsers

#### Options:

- ***from*** - Source browser to switch tab(s) from, full application name or browser types
- ***to*** - Target browser to switch tabs(s) to, full application name or browser types
- ***index*** - Tab index number in the browser window to execute the workflow
  - Set *index* to `all` to switch all tabs, or use action modifier `alt`





### Copy Data of Application/Browser/Tab(s)

#### Syntax: 

Action: `bcopy [url|title|selection|markdown|tabs] ; [from:|index:]`

Set Default Flags: `bset copy`

#### Flags:

- ***url*** - Copy URL of target window/tab if available
- ***title*** - Copy browser tab title or application window name
- ***selection*** - Copy selected text in window/tab if available
- ***markdown*** - Copy URL and title as a *link* in markdown syntax
- ***tabs*** - Copy information of tabs in JSON string format

#### Options:

- ***from*** - Source browser to switch tab(s) from, full application name or browser types
- ***index*** - Tab index number in the browser window to execute the workflow
  - Set *index* to `all` to switch all tabs, or use action modifier `alt`





### Open URL(s) From Selection/Clipboard

#### Syntax:

Action: `bopen [dedupe] ; [in:]`

Set Default Flags: `bset open`

#### Flags:

- ***dedupe*** - Deduplicate URL in target browser before opening a new tab
  - Use action modifier `alt` can open all extracted URLs

#### Options:

- ***in*** - Target browser to open URL(s)





### Stash Tabs In Browser Window

#### Syntax:

Action: `bstash [clone] ; [from:]; <stash group name>`

Set Default Flags: `bset stash`

#### Flags:

- ***clone*** - Do not close tabs after stashed them to group

#### Options:

- ***from*** - Source browser to get the list of tabs to stash

#### Others:

- ***stash group name*** - Group name saved in the stash file





### Un-Stash Saved Group Of Tabs

#### Syntax:

Action: `bunstash [clone] ; [to:]; <search>`

Set Default Flags: `bset unstash`

#### Flags:

- ***clone*** - Do not remove stash record after unstashed tabs

#### Options:

- ***to*** - Target browser to restore tabs to

#### Others:

- ***search*** - Search string to filter list of stashed groups


---




### User Files

- **stash list** -  located in `$USER_HOME/.config/bs-alfredworkflow/stash.json`
- **default flags config** - located in `$USER_HOME/.config/bs-alfredworkflow/config.json`





### JXA Script Syntax

` main.js [preview|run|defaults|set] <flags> ; <options> ; <notes|extras>`

- **preview** - Returns XML content of the query previews in Alfred
- **run** - Execute the query of action
- **defaults** - Returns XML content of the settings previews in Alfred
- **set** - Set default on/off states of flags per action





### Customizations

1. Create new action from **Actions - Run Script**, choose language **/bin/bash**
2. Write your own command with the call type of **run**, e.g.
   `osascript -l JavaScript main.js run "copy markdown; from: Safari"`
3. Assign a preferred trigger like a **Hot Key**, drag and connect trigger and action and output




### Todos

- ~~`stash` action to save/open multiple tabs at one time~~
- ~~Allow to specify source and target browser~~
- ~~Add delay and result validation between actions in command flow~~ (Removed the feature of actions flow)
- Firefox support
- Configurations of default options/~~flags~~
- Configurable notifications





### Licences

MIT

Icons from [iconfinder.com](https://www.iconfinder.com)