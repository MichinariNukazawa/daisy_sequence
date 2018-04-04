#

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

[ 1 -eq $# ]

BIN=$1

OBJECT_DIR=work

# output path nothing
set +e
${BIN} ../daisy_sequence/sample.daisysequence -o
RET=$?
set -e
[ 0 -ne $RET ]

# input file not exist
set +e
${BIN} ../daisy_sequence/sample.daisysequence-not-exist -o ${OBJECT_DIR}/a.svg
RET=$?
set -e
[ 0 -ne $RET ]

# no supported ext
set +e
${BIN} ../daisy_sequence/sample.daisysequence -o ${OBJECT_DIR}/a.bmp
RET=$?
set -e
[ 0 -ne $RET ]

# png not support
set +e
${BIN} ../daisy_sequence/sample.daisysequence -o ${OBJECT_DIR}/a.png
RET=$?
set -e
[ 0 -ne $RET ]

