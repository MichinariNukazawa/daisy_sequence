
.PHONY: all run test clean

all:
	# NOP
	exit 1

run:
	cd daisy_sequence && npm run run-open

simple-run:
	cd daisy_sequence && npm run build

test:
	bash ./release/version.sh
	#cd daisy_sequence && npm run test
	cd daisy_sequence && node ./build_linux_x64.js
	cd test && make

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

