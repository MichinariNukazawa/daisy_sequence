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


SOURCE_FILEPATH=../fileformat-example/message_all_kinds.daisysequence
DST_FILEPATH_0=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).png
${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH_0}

SOURCE_FILEPATH=../fileformat-example/sequence_number__simple.daisysequence
DST_FILEPATH_1=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).png
${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH_1}

set +e
cmp -s ${DST_FILEPATH_0} ${DST_FILEPATH_1}
RES=$?
set -e
[ 1 -eq $RES ]

