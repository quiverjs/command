
test: 
	echo john | bin/quiver-command ./test-module --config ./test-config.json --repeat

.PHONY: test