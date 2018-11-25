
.PHONY: all run test clean

all:
	# NOP
	exit 1

run:
	cd daisy_sequence && npm run run

run-open:
	cd daisy_sequence && npm run run-open

simple-run:
	cd daisy_sequence && npm run build

.PHONY: test unit-test cli-test ci-test

unit-test:
	cd daisy_sequence && npm run test test/$(ARG)

cli-test:
	cd test && make

ci-test:
	cd daisy_sequence && npm install
	bash ./release/version.sh
	make unit-test
	#make package
	cd daisy_sequence && npm run pack:linux
	cd test && make ci-test # depend linux binary

test:
	bash ./release/version.sh
	make unit-test
	cd daisy_sequence && npm run pack:linux
	make cli-test # depend linux binary

clean:
	cd test && make clean
	rm -rf release/release
	rm -rf daisy_sequence/release

doc:
	cd document/user_manual/ && bash ./build.sh

.PHONY: package package_desktop
package: package_desktop

package_desktop:
	bash ./release/version.sh
	bash ./release/installer_win32_x64.sh
	bash ./release/installer_darwin.sh
	bash ./release/installer_debian.sh

