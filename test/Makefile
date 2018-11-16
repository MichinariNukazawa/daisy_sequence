
.PHONY: all test ci-test
all: test

BIN=../daisy_sequence/release/linux/daisy_sequence-linux-x64/daisy_sequence

test: ci-test
	bash ./export_test_with_plantuml.sh $(BIN)

ci-test:
	bash ./invalid_test.sh $(BIN)
	bash ./export_test.sh $(BIN)

clean:
	rm -rf work

