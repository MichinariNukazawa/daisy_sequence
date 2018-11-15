#!/bin/bash
#
# cross build
# host:		Ubuntu (Ubutn16.04 LTS amd64)
# target:	Win64
#
# Author: michinari.nukazawa@gmail.com
#

set -eu
set -o pipefail

trap 'echo "error:$0($LINENO) \"$BASH_COMMAND\" \"$@\""' ERR


SCRIPT_DIR=$(cd $(dirname $0); pwd)
ROOT_DIR=${SCRIPT_DIR}/..
SOURCE_DIR=${ROOT_DIR}/daisy_sequence

APP_NAME=$(cat ${SOURCE_DIR}/package.json | grep '"name"' | sed -e 's/.\+:.*"\([-A-Za-z_0-9.]\+\)".\+/\1/g')

BUILD_DIR=${SOURCE_DIR}/release/osx/${APP_NAME}-darwin-x64
PACKAGE_DIR=${SOURCE_DIR}/release/osx/${APP_NAME}-darwin-x64
RELEASE_DIR=${ROOT_DIR}/release/release

PACKAGE_POSTFIX=
if [ 1 -eq $# ] ; then
	PACKAGE_POSTFIX="-$1"
fi

SHOW_VERSION=$(cat ${SOURCE_DIR}/package.json | grep "version" | sed -e 's/.\+:.*"\([0-9.]\+\)".\+/\1/g')

GIT_HASH=$(git log --pretty=format:'%h' -n 1)
GIT_STATUS_SHORT=$(git diff --stat | tail -1)
EX=""
if [ -n "${GIT_STATUS_SHORT}" ] ; then
EX="develop"
fi
PACKAGE_NAME=${APP_NAME}-macosx-${SHOW_VERSION}${EX}-${GIT_HASH}${PACKAGE_POSTFIX}

## build
rm -rf ${BUILD_DIR}
pushd ${SOURCE_DIR}
npm run pack:osx
popd


## packaging
#rm -rf ${PACKAGE_DIR}
#mv ${BUILD_DIR} ${PACKAGE_DIR}

cp ${ROOT_DIR}/README.md ${PACKAGE_DIR}/

pushd ${PACKAGE_DIR}

rm -f ${RELEASE_DIR}/${PACKAGE_NAME}.zip
mkdir -p ${RELEASE_DIR}
zip -r9 ${RELEASE_DIR}/${PACKAGE_NAME}.zip *

popd

