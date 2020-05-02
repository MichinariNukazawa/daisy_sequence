#
# depend: sudo apt install librsvg2-bin -y

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

[ 1 -eq $# ]
BIN=$1

OBJECT_DIR=obj/$(basename $0)
rm -rf ${OBJECT_DIR}/*
mkdir -p ${OBJECT_DIR}


SOURCE_FILEPATH=../fileformat-example/dividers.daisysequence
DST_FILEPATH_0=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).puml
${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH_0}

diff ${DST_FILEPATH_0} data/dividers.puml

