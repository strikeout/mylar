#include "main/multikey.hh"

#include "pbc.h"
#include "main/sha.hh"

#include <util/util.hh>

using namespace std;

mksearch::mksearch() {
    g = ec.sample_G2();
}

mksearch::mksearch(unsigned char* g_ser) {
    g.e = new element_s();
    ec.elem_init_G2(g.e);
    ec_serializable::from_bytes(g_ser, g);
}

mksearch::~mksearch() {
}

char*
mksearch::serialize() {
    void* result;
    g.to_bytes(&result);
    return (char*) result;
}

void
mksearch::init_key(ec_scalar &k) const {
    k.e = new element_s();
    ec.elem_init_Zr(k.e);
}

void
mksearch::init_tok(ec_point &t) const {
    // t can be a token or a delta
    t.e = new element_s();
    ec.elem_init_G2(t.e);
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
mksearch::adjust(const ec_point & tok, const ec_point & delta) const {
    return ec.pair(tok, delta).stringify(EC::CTSIZE);
}

bool
mksearch::match(const string & stok, const string & ciph) const {
    return ec.has_pattern(stok, ciph);
}

extern "C" {

    void* mksearch_new() {
        mksearch mk;
        return mk.serialize();
    }

    void* mksearch_keygen(void* g) {
        void *result;
        mksearch mk((unsigned char*) g);
        mk.keygen().to_bytes(&result);
        return result;
    }
  
    void* mksearch_delta(void* g, void* k1, void* k2) {
        mksearch mk((unsigned char*) g);
        void* result;
        ec_scalar k1s, k2s;
        mk.init_key(k1s);
        mk.init_key(k2s);
        ec_serializable::from_bytes((unsigned char*) k1, k1s);
        ec_serializable::from_bytes((unsigned char*) k2, k2s);
        mk.delta(k1s, k2s).to_bytes(&result);
        return result;
    }

    void* mksearch_token(void* g, void* k, char* _word) {
        string word = string(_word);
        mksearch mk((unsigned char*) g);
        void* result;
        ec_scalar ks;
        mk.init_key(ks);
        ec_serializable::from_bytes((unsigned char*) k, ks);
        mk.token(ks, word).to_bytes(&result);
        return result;
    }

    void* mksearch_encrypt(void* g, void* k, char* _word) {
        string word = string(_word);
        string ct;
        void* result;
        mksearch mk((unsigned char*) g);
        ec_scalar ks;
        mk.init_key(ks);
        ec_serializable::from_bytes((unsigned char*) k, ks);
        ct = mk.encrypt(ks, word);
        result = malloc(ct.size());
        memcpy(result, ct.data(), ct.size());
        return result;
    }

    void* mksearch_adjust(void* g, void* tok, void* delta) {
        void* result;
        string adj;
        mksearch mk((unsigned char*) g);
        ec_point tokpt, deltapt;
        mk.init_tok(tokpt);
        mk.init_tok(deltapt);
        ec_serializable::from_bytes((unsigned char*) tok, tokpt);
        ec_serializable::from_bytes((unsigned char*) delta, deltapt);
        adj = mk.adjust(tokpt, deltapt);
        result = malloc(adj.size());
        memcpy(result, adj.data(), adj.size());
        return result;
    }

    int mksearch_match(void* g, void* token, void* ciph) {
        mksearch mk((unsigned char*) g);
        return mk.match(string((char*) token, EC::CTSIZE), string((char*) ciph, EC::CTSIZE));
    }
}
