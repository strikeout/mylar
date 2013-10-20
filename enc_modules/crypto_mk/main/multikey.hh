#pragma once

/* Multi-key search */

#include "pbc/pbc.h"
#include <string>
#include "main/ec.hh"


class mksearch {
public:

    mksearch();
    ~mksearch();
    
    ec_scalar keygen() const;

    ec_point delta(const ec_scalar & fromkey, const ec_scalar & tokey) const;

    ec_point token(const ec_scalar & k, const std::string & word) const;
    std::string encrypt(const ec_scalar & k, const std::string & word);

    std::string adjust(const ec_point & tok, const ec_point & delta) const;
    bool match(const std::string & searchtok, const std::string & ciph) const;

    std::string index_enc(const ec_scalar & k, const std::string & word);
    // index_enc is a deterministic encryption and 
    // match(index_enc(k, w), encrypt(k, w)) = true;
 
    // serialization
    std::string serialize();
    mksearch(std::string g_ser);

    ec_point from_bytes(const std::string & serial, ECTYPE group);
    static std::string to_bytes(const ec_point & p);
    ec_scalar from_bytes(const std::string & serial);
    static std::string to_bytes(const ec_scalar & s);    
    
private:
    EC ec;
    ec_point g;
};


