
test: 
	echo john | node lib/command.js ./test-module --config ./test-config.json --repeat

.PHONY: test