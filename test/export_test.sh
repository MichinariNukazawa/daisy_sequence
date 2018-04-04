#
# depend: sudo apt install librsvg2-bin -y

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

[ 1 -eq $# ]
BIN=$1

OBJECT_DIR=work

mkdir -p ${OBJECT_DIR}
rm -rf ${OBJECT_DIR}/*

# svg
SOURCE_PATH=../daisy_sequence/sample.daisysequence
DST_PATH=${OBJECT_DIR}/sample.svg
${BIN} ${SOURCE_PATH} -o ${DST_PATH}
[ -s ${DST_PATH} ] # file is not zero size
# STR=`file ${DST_PATH}` ; [[ "${STR}" =~ "SVG" ]] # file type # `file` is now work(SGML).
rsvg-convert -o ${DST_PATH}.png ${DST_PATH} # check file type is svg.
grep 'width="500"' ${DST_PATH} > /dev/null
grep 'height="650"' ${DST_PATH} > /dev/null

# PlantUML(.puml)
SOURCE_PATH=./data/test01.daisysequence
DST_PATH=${OBJECT_DIR}/sample.puml
${BIN} ${SOURCE_PATH} -o ${DST_PATH}
[ -s ${DST_PATH} ] # file is not zero size
plantuml ${DST_PATH}
[ -s "${DST_PATH%.puml}.png" ]

