#!/bin/bash
#

set -eu
set -o pipefail

trap 'echo "error:$0($LINENO) \"$BASH_COMMAND\" \"$@\""' ERR


# install depend package
# https://github.com/nodesource/distributions
if type npm 2>/dev/null 1>/dev/null ; then
	echo "npm already exist."
else
	# sudo apt install npm -y
	sudo apt install curl -y
	curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
	sudo apt install -y nodejs
fi

# install depend package
sudo apt install librsvg2-bin plantuml -y

