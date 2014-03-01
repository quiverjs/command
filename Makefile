
test: 
	echo john | bin/quiver-command ./test/test-module --config ./test/config.json --repeat
	echo john | node ./test/test-module --config ./test/config.json --repeat
	echo john | bin/quiver-command ./test/test-module/component.js --config ./test/config.json

.PHONY: test