
.PHONY: all test
all: test

.PHONY: bin
BIN=../release/release/daisy_sequence-linux-x64/daisy_sequence
bin: $(BIN)
	../daisy_sequence && node ./build_linux_x64.js

#test: $(BIN)
test:
	bash ./invalid_test.sh $(BIN)
	bash ./export_test.sh $(BIN)

