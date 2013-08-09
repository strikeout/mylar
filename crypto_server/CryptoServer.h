#pragma once

#include <string>

#include "b64_wrapper.hh"


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

#define VERB false

class CryptoServer {

public:
    // process request
    std::string process(const std::string & request);

private:
    b64mk mk;
};


