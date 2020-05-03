#

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

#
[ 1 -eq $# ]
BIN=$1

OBJECT_DIR=obj/$(basename $0)
rm -rf ${OBJECT_DIR}/*
mkdir -p ${OBJECT_DIR}

## exist input file
[ -e ../daisy_sequence/resource/default_document.daisysequence ]

## valid pattern
${BIN} ../daisy_sequence/resource/default_document.daisysequence -o ${OBJECT_DIR}/a.svg


# invalid test
## nothing option
set +e
${BIN} ../daisy_sequence/resource/default_document.daisysequence
RET=$?
set -e
[ 0 -ne $RET ]

## output path nothing
set +e
${BIN} ../daisy_sequence/resource/default_document.daisysequence -o
RET=$?
set -e
[ 0 -ne $RET ]

## "-o" nothing
set +e
${BIN} ../daisy_sequence/resource/default_document.daisysequence ${OBJECT_DIR}/a.svg
RET=$?
set -e
[ 0 -ne $RET ]

## output dir nothing
set +e
${BIN} ../daisy_sequence/resource/default_document.daisysequence -o ${OBJECT_DIR}/dir-not-exist/a.svg
RET=$?
set -e
[ 0 -ne $RET ]

## input file not exist
set +e
${BIN} ../daisy_sequence/document-not-exist.daisysequence -o ${OBJECT_DIR}/a.svg
RET=$?
set -e
[ 0 -ne $RET ]

## no supported ext
set +e
${BIN} ../daisy_sequence/resource/default_document.daisysequence -o ${OBJECT_DIR}/a.bmp
RET=$?
set -e
[ 0 -ne $RET ]

## invalid argument '-psn_0_xxxxxx' in macosx (simulate)
set +e
${BIN} -psn_0_0000000
RET=$?
set -e
[ 0 -ne $RET ]

## over argument
set +e
${BIN} ../daisy_sequence/resource/default_document.daisysequence -o ${OBJECT_DIR}/a.svg ${OBJECT_DIR}/b.svg
RET=$?
set -e
[ 0 -ne $RET ]

