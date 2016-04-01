#!/usr/bin/env bash

for file in ./src/*.js; do
    (echo "#!/usr/bin/env osascript -l JavaScript"; ./node_modules/.bin/rollup -c $1 -i $file ) > "./dist/$(basename $file)";
    chmod +x "./dist/$(basename $file)";
done
