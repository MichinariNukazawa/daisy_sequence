
.PHONY: all test
all: test

BIN=../daisy_sequence/release/linux/daisy_sequence-linux-x64/daisy_sequence

test:
	bash ./invalid_test.sh $(BIN)
	bash ./export_test.sh $(BIN)

