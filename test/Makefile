
BIN_CLI=../daisy_sequence/bin/daisy-sequence-cli.js
BIN_GUI=../daisy_sequence/release/linux/daisy_sequence-linux-x64/daisy_sequence

.PHONY: all test ci-test
.PHONY: gui-test

all: test

test:
	make ci-test
	bash ./export_test_with_plantuml.sh $(BIN_CLI)

ci-test:
	make gui-cli-test
	make cli-test

cli-test:
	bash ./invalid_test.sh $(BIN_CLI)
	bash ./export_test.sh $(BIN_CLI)

gui-cli-test:
	bash ./gui_cli_test.sh $(BIN_GUI)

clean:
	rm -rf obj/

