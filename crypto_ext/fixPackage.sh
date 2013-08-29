startLine=$(cat $1 | grep -n START_OF_EXT_FILES | sed "s/:.*//g")
endLine=$(cat $1 | grep -n END_OF_EXT_FILES | sed "s/:.*//g")
fileSize=$(wc -l $1 | sed "s/ .*//g")

headerSize=$startLine
footerSize=$(($fileSize - $endLine + 1))


head -n $headerSize $1 | cat

for i in `find bin -maxdepth 2 -type f | sed "s/bin\///g" | grep -v "\(main\|src\)"`; do
	echo "      api.add_files(path.join('crypto_ext', '$i'), 'client');"
done

tail -n $footerSize $1 | cat
