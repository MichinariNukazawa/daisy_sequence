
.PHONY: all run test clean

all:
	# NOP
	exit 1

run:
	cd daisy_sequence && npm run run-open

simple-run:
	cd daisy_sequence && npm run build

.PHONY: test unit-test cli-test ci-test
ci-test:
	cd daisy_sequence && npm install
	make test
	#make package

unit-test:
	cd daisy_sequence && npm run test test/$(ARG)

cli-test:
	cd test && make

test:
	bash ./release/version.sh
	make unit-test
	make cli-test
	cd daisy_sequence && node ./build_linux_x64.js

clean:
	rm -rf release/release

doc:
	cd document/user_manual/ && bash ./build.sh

.PHONY: package package_desktop
package: package_desktop

package_desktop:
	bash ./release/version.sh
	bash ./release/installer_win32_x64.sh
	bash ./release/installer_darwin.sh
	bash ./release/installer_debian.sh

