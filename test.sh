#!/bin/bash

# Copyright (c) 2016 Accusoft Corp.

# Permission is hereby granted, free of charge, to any person obtaining a copy of 
# this software and associated documentation files (the "Software"), to deal in 
# the Software without restriction, including without limitation the rights to 
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
# of the Software, and to permit persons to whom the Software is furnished to do 
# so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all 
# copies or substantial portions of the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
# SOFTWARE.


if [[ "$1" == "clean" ]]; then
  ./clean.sh
  exit 0
fi

if [[ "$1" == "teamcity" ]]; then
    echo './test/**/*.test.js --reporter mocha-teamcity-cov-reporter --ui bdd' > ./test/mocha.opts
    mkdir test_artifacts
    node node_modules/mocha/bin/mocha -u tdd --reporter mocha-teamcity-reporter
    node node_modules/istanbul/lib/cli.js cover -x 'node_modules/**' --report teamcity --report html node_modules/mocha/bin/_mocha --reporter='mocha-teamcity-cov-reporter'
    node node_modules/eslint/bin/eslint.js --format './node_modules/eslint-teamcity/index.js' -f jslint-xml './**.js' > test_artifacts/eslint.xml ; exit 0
  else
    echo './test/**/*.test.js --reporter spec --ui bdd' > ./test/mocha.opts
    node node_modules/istanbul/lib/cli.js cover -x 'node_modules/**' --report html _mocha --reporter='spec'
    node node_modules/eslint/bin/eslint.js './**.js'
fi
