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

    NTL::ZZ encrypt(const std::vector<NTL::ZZ> & pk, const NTL::ZZ & word);
    NTL::ZZ add(const std::vector<NTL::ZZ> & pk, const NTL::ZZ & c1, const NTL::ZZ & c2);
    NTL::ZZ decrypt(const std::vector<NTL::ZZ> & k, const NTL::ZZ & cipher);

	std::vector<NTL::ZZ> from_bytes(const std::string & serial);
    static std::string to_bytes(const std::vector<NTL::ZZ> & k);

	NTL::ZZ from_bytesN(const std::string & serial);
    static std::string to_bytes(const NTL::ZZ & k);
};


