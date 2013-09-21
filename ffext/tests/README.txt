# test page load times with (ext) or without (plain) extension. Use as follows:

python test_ext.py 100 all (will run all tests 100 times)

python test_ext.py 100 ext (will run tests for ext 100 times)

python test_ext.py 100 plain (will run tests for plain 100 times)

For representative page load times, it's best not to use 'all', because the second test will always run faster than the first one for some reason.

to test a page with meteor_enc, the meteor_enc server has to be run in split mode. make sure to pass --production to meteor run, otherwise the extension will be much slower because hash verification is a bottleneck (it's not parallelized).
