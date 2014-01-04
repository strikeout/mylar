#pragma once

#include <string>

#include "b64_wrapper.hh"


/* Server doing multi key crypto
 *
 * keygen                   -> k
 * delta k1 k2              -> delta
 * encrypt k word           -> ciph
 * index_enc k word         -> ciph
 * token k word             -> tok
 * adjust tok delta         -> searchtok
 * match searchtok ciph     -> boolean
 * pkeygen                  -> k
 * ppubkey k                -> pk
 * pencrypt pk plain        -> ciph
 * padd pk c1 c2            -> ciph
 * pdecrypt k ciph          -> plain
 */

#define VERB false

class CryptoServer {

public:
    // process request
    std::string process(const std::string & request);

private:
    b64mk mk;
};


