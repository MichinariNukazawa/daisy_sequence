
.PHONY: all run test clean

all:
	# NOP
	exit 1

run:
	cd daisy_sequence && npm run run

run-open:
	cd daisy_sequence && npm run run-open

.PHONY: test uitest cli-test ci-test

uitest:
	cd daisy_sequence && npm run test test/$(ARG)

ci-test:
	cd daisy_sequence && npm install
	make uitest
	#make package
	cd daisy_sequence && npm run pack:linux
	cd command-line-test && make ci-test # cd test && make ci-test # depend linux binary

clitest:
	cd daisy_sequence && npm run pack:linux
	cd command-line-test && make test # depend linux binary

test:
	make uitest
	cd daisy_sequence && npm run pack:linux
	make clitest

clean:
	cd command-line-test && make clean
	rm -rf release/release
	rm -rf daisy_sequence/release
	rm -rf daisy_sequence/node_modules

doc:
	cd document/user_manual/ && bash ./build.sh

.PHONY: package package_desktop
package: package_desktop

package_desktop:
	rm -rf daisy_sequence/node_modules
	cd daisy_sequence && npm install && npm audit fix
	# notice: in macosx cli test do not running
	make test
	bash ./release/installer_win32_x64.sh
	bash ./release/installer_darwin.sh
	bash ./release/installer_debian.sh

