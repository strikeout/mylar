#include "main/multikey.hh"

#include "pbc/pbc.h"
#include "main/sha.hh"

#include <util/util.hh>

using namespace std;

mksearch::mksearch() {
    g = ec.sample_G2();
}

mksearch::~mksearch() {
}


string
mksearch::serialize() {
    return g.to_bytes();
}


mksearch::mksearch(std::string g_ser) {

   ec_point * p =  (ec_point *)ec_serializable::from_bytes(g_ser, ECTYPE::G2, ec.pairing);
   g = ec_point(p->e);

   delete p;
}


ec_scalar
mksearch::keygen() const {
    return ec.sample_scalar();
}

ec_point
mksearch::delta(const ec_scalar & k1, const ec_scalar & k2) const {
    return g^(k2/k1);
}

ec_point
mksearch::token(const ec_scalar & k, const string & word) const {
    return ec.hash(word)^k;
}

string
mksearch::encrypt(const ec_scalar & k, const string & word)  {
    return ec.xor_pattern(ec.pair(ec.hash(word)^k, g));
}

string
mksearch::index_enc(const ec_scalar & k, const string & word)  {
    string res = ec.pair(ec.hash(word)^k, g).to_bytes();
    return res.substr(0, EC::CTSIZE);
}

string
mksearch::adjust(const ec_point & tok, const ec_point & delta) const {
    string res = ec.pair(tok, delta).to_bytes();
//    cerr << "result of adjust is len " << res.length() << " content " << res << "\n";
    return res.substr(0, EC::CTSIZE);
}

bool
mksearch::match(const string & stok, const string & ciph) const {
    return ec.has_pattern(stok, ciph);
}


// serialization
ec_point
mksearch::from_bytes(const string & serial, ECTYPE group) {
    ec_point * p = (ec_point *)ec_serializable::from_bytes(serial, group, ec.pairing);
    ec_point res(p->e);
    delete p;

    return res;
}

std::string
mksearch::to_bytes(const ec_point & p) {
    return p.to_bytes();
}

ec_scalar
mksearch::from_bytes(const string & serial) {
    ec_scalar * s = (ec_scalar *)ec_serializable::from_bytes(serial, ECTYPE::Zr, ec.pairing);
    ec_scalar res(s->e);
    delete s;
    
    return res;
}

std::string
mksearch::to_bytes(const ec_scalar & s) {
    return s.to_bytes();
}   
  

