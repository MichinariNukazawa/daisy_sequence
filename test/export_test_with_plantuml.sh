#
# depend: sudo apt install librsvg2-bin plantuml -y

set -ue
set -x

trap 'echo "$0(${LINENO}) ${BASH_COMMAND}"' ERR

[ 1 -eq $# ]
BIN=$1

OBJECT_DIR=obj/plantuml

rm -rf ${OBJECT_DIR}/*
mkdir -p ${OBJECT_DIR}

FILES=`find ../fileformat-example -name "*.daisysequence" -type f`
for F in $FILES; do
	# PlantUML(.puml)
	SOURCE_FILEPATH=$F
	DST_FILEPATH=${OBJECT_DIR}/$(basename ${SOURCE_FILEPATH}).puml

	${BIN} ${SOURCE_FILEPATH} -o ${DST_FILEPATH}
	[ -s ${DST_FILEPATH} ] # file is not zero size
	plantuml ${DST_FILEPATH}
	[ -s "${DST_FILEPATH%.puml}.png" ]
done

