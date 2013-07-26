import os
from ctypes import *

# Load the multikey search library
d = os.path.dirname(os.path.realpath(__file__))
par = os.path.join(d, os.pardir)
lib = CDLL(os.path.join(par, "obj", "libcryptmk.so"))
# Have to change directories to read the params dir that's hard-coded
# in ec/ec.cc, not sure how to fix this.
os.chdir(par)

# Get a serialized mksearch instance
lib.mksearch_new.restype = c_void_p # Sets the return type of mksearch_new
g = lib.mksearch_new()

lib.mksearch_keygen.argtypes = [c_void_p] # Sets the argument types of mksearch_keygen
lib.mksearch_keygen.restype = c_void_p
# Generate two keys
k1 = lib.mksearch_keygen(g)
k2 = lib.mksearch_keygen(g)

lib.mksearch_delta.argtypes = [c_void_p, c_void_p, c_void_p]
lib.mksearch_delta.restype = c_void_p
# Get an adjustment token for k1 -> k2
delta = lib.mksearch_delta(g, k1, k2)

lib.mksearch_token.argtypes = [c_void_p, c_void_p, c_char_p]
lib.mksearch_token.restype = c_void_p
# Get a k1 token
token = lib.mksearch_token(g, k1, "abc")

lib.mksearch_encrypt.argtypes = [c_void_p, c_void_p, c_char_p]
lib.mksearch_encrypt.restype = c_void_p
# Encrypt two words with k2
ct_match = lib.mksearch_encrypt(g, k2, "abc")
ct_nomatch = lib.mksearch_encrypt(g, k2, "abcd")

lib.mksearch_adjust.argtypes = [c_void_p, c_void_p, c_void_p]
lib.mksearch_adjust.restype = c_void_p
# k1 token -> k2 token
stok = lib.mksearch_adjust(g, token, delta)

lib.mksearch_match.argtypes = [c_void_p, c_void_p, c_void_p]
lib.mksearch_match.restype = c_int

print "Word should match: %d" % lib.mksearch_match(g, stok, ct_match)
print "Word should not match: %d" % lib.mksearch_match(g, stok, ct_nomatch)

# I don't really know what these delete calls do. The mksearch_*
# functions dynamically allocate memory that should be freed by the
# caller, but I don't know if del actually does that.
del delta
del token
del ct_match
del ct_nomatch
del stok
del k2
del k1
del g
