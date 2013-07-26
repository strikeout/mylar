#pragma once

/* Multi-key search */

#include "pbc.h"
#include <string>
#include "main/ec.hh"


class mksearch {
public:

    mksearch();
    mksearch(unsigned char* g_ser);
    ~mksearch();
    
    ec_scalar keygen() const;

    ec_point delta(const ec_scalar & fromkey, const ec_scalar & tokey) const;

    ec_point token(const ec_scalar & k, const std::string & word) const;
    std::string encrypt(const ec_scalar & k, const std::string & word);
    
    std::string adjust(const ec_point & tok, const ec_point & delta) const;
    bool match(const std::string & searchtok, const std::string & ciph) const;


    // serialization functions
    
    char* serialize();
    void init_key(ec_scalar &k) const;
    void init_tok(ec_point &k) const;
    
private:
    EC ec;
    ec_point g;
};

extern "C" {
    // Caller is responsible for freeing the results of all these functions.
    void* mksearch_new();
    void* mksearch_keygen(void* g);
    void* mksearch_delta(void* g, void* k1, void* k2);
    void* mksearch_token(void* g, void* k, char* _word);
    void* mksearch_encrypt(void* g, void* k, char* _word);
    void* mksearch_adjust(void* g, void* tok, void* delta);
    int mksearch_match(void* g, void* token, void* ciph);
}
