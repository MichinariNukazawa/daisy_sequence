
.PHONY: all run clean

all:
	# NOP
	exit 1

run:
	cd daisy_sequence && npm run run-open

simple-run:
	cd daisy_sequence && npm run build

test:
	cd daisy_sequence && npm run test

clean:
	rm -rf release/release

.PHONY: package package_desktop
package: package_desktop

package_desktop:
	bash ./release/version.sh
	bash ./release/installer_win32_x64.sh
	bash ./release/installer_darwin.sh
	bash ./release/installer_debian.sh

