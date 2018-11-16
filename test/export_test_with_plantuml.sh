#
# depend: sudo apt install librsvg2-bin plantuml -y

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

[ 1 -eq $# ]
BIN=$1

OBJECT_DIR=work/plantuml

rm -rf ${OBJECT_DIR}/*
mkdir -p ${OBJECT_DIR}

# PlantUML(.puml)
SOURCE_PATH=./data/test01.daisysequence
DST_PATH=${OBJECT_DIR}/test01.puml
${BIN} ${SOURCE_PATH} -o ${DST_PATH}
[ -s ${DST_PATH} ] # file is not zero size
plantuml ${DST_PATH}
[ -s "${DST_PATH%.puml}.png" ]

SOURCE_PATH=./data/test02.daisysequence
DST_PATH=${OBJECT_DIR}/test02.puml
${BIN} ${SOURCE_PATH} -o ${DST_PATH}
[ -s ${DST_PATH} ] # file is not zero size
plantuml ${DST_PATH}
[ -s "${DST_PATH%.puml}.png" ]

SOURCE_PATH=./data/test_all_fragments.daisysequence
DST_PATH=${OBJECT_DIR}/test_fragments.puml
${BIN} ${SOURCE_PATH} -o ${DST_PATH}
[ -s ${DST_PATH} ] # file is not zero size
plantuml ${DST_PATH}
[ -s "${DST_PATH%.puml}.png" ]

