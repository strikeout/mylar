#pragma once

/* Multi-key search */

#include "pbc/pbc.h"
#include <NTL/ZZ.h>
#include <string>
#include "main/ec.hh"


class mksum {
public:

    mksum();
    ~mksum();
    
	std::vector<NTL::ZZ> keygen() const;

    std::string encrypt(const std::vector<NTL::ZZ> & k, const std::string & word);
    std::string add(const std::vector<NTL::ZZ> & k, const std::string & c1, const std::string & c2);
    std::string decrypt(const std::vector<NTL::ZZ> & k, const std::string & cipher);

	std::vector<NTL::ZZ> from_bytes(const std::string & serial);
    static std::string to_bytes(const std::vector<NTL::ZZ> & k);
};


