
.PHONY: all run clean

all:
	# NOP
	exit 1

run:
	cd daisy_sequence && npm run build

test:
	cd daisy_sequence && npm run test

clean:
	rm -rf release

.PHONY: package package_desktop
package: package_desktop

package_desktop:
	bash ./installer_win32_x64.sh
	bash ./installer_darwin.sh
	bash ./installer_debian.sh

