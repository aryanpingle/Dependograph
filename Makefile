.PHONY: swap

swap:
	mv node_modules temp && mv node_modules_actual node_modules && mv temp node_modules_actual