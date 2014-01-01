
test: 
	echo john | bin/quiver-command ./test/test-module --config ./test/test-config.json --repeat
	echo john | node ./test/test-module --config ./test/test-config.json --repeat

.PHONY: test