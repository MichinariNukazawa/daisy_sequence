#
# depend: sudo apt install librsvg2-bin plantuml -y

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

[ 1 -eq $# ]
BIN=$1

OBJECT_DIR=obj/$(basename $0)
rm -rf ${OBJECT_DIR}/*
mkdir -p ${OBJECT_DIR}


F=../fileformat-example/test01.daisysequence


# svg
SOURCE_FILEPATH=$F
DST_FILEPATH=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).svg

${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH}
[ -s ${DST_FILEPATH} ] # file is not zero size
rsvg-convert -o ${DST_FILEPATH}.png ${DST_FILEPATH} # check file type is svg.
[ -s ${DST_FILEPATH}.png ]


# png
SOURCE_FILEPATH=$F
DST_FILEPATH=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).png

${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH}
[ -s ${DST_FILEPATH} ] # file is not zero size
STR=`file ${DST_FILEPATH}` ; [[ "${STR}" =~ "PNG" ]] # file type


# PlantUML(.puml)
SOURCE_FILEPATH=$F
DST_FILEPATH=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).puml

${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH}
[ -s ${DST_FILEPATH} ] # file is not zero size
#plantuml ${DST_FILEPATH}
#[ -s "${DST_FILEPATH%.puml}.png" ]

