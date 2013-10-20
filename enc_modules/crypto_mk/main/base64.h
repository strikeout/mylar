// From http://www.adp-gmbh.ch/cpp/common/base64.html

#include <string>

std::string base64_encode(unsigned char const*, unsigned int len);
std::string base64_decode(std::string const& s);
std::string base64_encode(std::string const& s);
