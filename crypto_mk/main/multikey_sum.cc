#include "main/multikey_sum.hh"

#include "NTL/ZZ.h"
#include "pbc/pbc.h"
#include "main/sha.hh"

#include <util/util.hh>

using namespace std;

mksum::mksum() {
}

mksum::~mksum() {
}

vector<NTL::ZZ>
mksum::keygen() const {
    return vector<NTL::ZZ>();
}

string
mksum::encrypt(const vector<NTL::ZZ> & k, const string & word)  {
    return "CODE";
}

string
mksum::add(const vector<NTL::ZZ> & k, const std::string & c1, const std::string & c2) {
	return c1 + " " + c2;
}

string
mksum::decrypt(const vector<NTL::ZZ> & k, const string & cipher)  {
    return "PLAIN";
}

// serialization
vector<NTL::ZZ>
mksum::from_bytes(const string & serial) {
    return vector<NTL::ZZ>();
}

std::string
mksum::to_bytes(const vector<NTL::ZZ> & p) {
    return "";
}

