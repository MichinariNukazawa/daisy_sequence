#!/bin/bash
#

set -eu
set -o pipefail

trap 'echo "error:$0($LINENO) \"$BASH_COMMAND\" \"$@\""' ERR

SCRIPT_DIR=$(cd $(dirname $0); pwd)
ROOT_DIR=${SCRIPT_DIR}/..
SOURCE_DIR=${ROOT_DIR}/daisy_sequence

PACKAGE_JS_VERSION=$(cat ${SOURCE_DIR}/package.json | grep '"version"' | sed -e 's/.\+:.*"\([0-9.]\+\)".\+/\1/g')
VERSION_JS_VERSION=$(cat ${SOURCE_DIR}/js/version.js | grep '"version"' | sed -e 's/.\+:.*"\([0-9.]\+\)".\+/\1/g')

echo ${PACKAGE_JS_VERSION}
echo ${VERSION_JS_VERSION}
[ ${PACKAGE_JS_VERSION} == ${VERSION_JS_VERSION} ]

