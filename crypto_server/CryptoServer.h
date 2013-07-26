#pragma once

#include <string>

#include "multikey.hh"


/* Server doing multi key crypto
 *
 * keygen                   -> k
 * delta k1 k2              -> delta
 * encrypt k word           -> ciph
 * token k word             -> tok
 * adjust tok delta         -> searchtok
 * match searchtok ciph     -> boolean
 *
 */

class CryptoServer {

public:
    CryptoServer()  {};
    
    // process request
    std::string process(const std::string & request);

private:
    mksearch mk;
};


