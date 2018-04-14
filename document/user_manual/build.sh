#!/bin/bash
#
# author : MichinariNukazawa / "project daisy bell"
# 	michinari.nukazawa@gmail.com
# depend : sudo apt install texlive -y
#

set -eu
set -o pipefail

trap 'echo "error:$0($LINENO) \"$BASH_COMMAND\" \"$@\""' ERR

SCRIPT_DIR=$(cd $(dirname $0);pwd)
TEX_SCRIPT=${SCRIPT_DIR}"/user_manual.tex"

Return=0

# pushd(cd) is target book dir.
pushd ${SCRIPT_DIR}

#
# manual ai to pdf
# manual electron widh markdown to pdf. user_manual_content.md user_manual_content.pdf

pdflatex -halt-on-error -interaction=nonstopmode -file-line-error "$TEX_SCRIPT" > ${SCRIPT_DIR}"/tex.log"
if [ 0 -ne $? ] ; then
	echo "error: full version build is failure."
	Return=-1
	# exit -1
fi

rm -f book*.log
rm -f book*.aux

popd

exit ${Return}

