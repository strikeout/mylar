#pragma once

/*
  Base 64 encoding wrappers around the multi-key search. 
*/



#include "pbc/pbc.h"
#include <string>
#include "main/multikey.hh"


class b64mk {
public:

    b64mk();
    ~b64mk();
    
    std::string keygen() const;

    std::string delta(const std::string & fromkey, const std::string & tokey);

    std::string token(const std::string & k, const std::string & word);
    std::string encrypt(const std::string & k, const std::string & word);
    
    std::string adjust(const std::string & tok, const std::string & delta);
    bool match(const std::string & searchtok, const std::string & ciph);


    // serialization functions    
    std::string serialize();
    b64mk(std::string g_ser);

    
private:
    mksearch mk;
};

