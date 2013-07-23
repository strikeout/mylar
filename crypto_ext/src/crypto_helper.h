#include "ec.hh"

namespace crypto_ext {
  class mksearch {
  public:
	
	mksearch();
	mksearch(unsigned char* g_ser);
	~mksearch();
	
	char* serialize();
	char* serializeLen(int *len);

	void init_key(ec_scalar &k);
	void init_tok(ec_point &k);
	
	ec_scalar keygen();
	
	ec_point delta(const ec_scalar & fromkey, const ec_scalar & tokey);
	
	ec_point token(const ec_scalar & k, const std::string & word);
	std::string encrypt(const ec_scalar & k, const std::string & word);
  
	std::string adjust(const ec_point & tok, const ec_point & delta);
	bool match(const std::string & searchtok, const std::string & ciph);
	
	EC ec;
	ec_point g;
  };
}

extern "C" {
  void* mksearch_new();
  void* mksearch_keygen(void* g);
  void* mksearch_delta(void* g, void* k1, void* k2);
  void* mksearch_token(void* g, void* k, char* _word);
  void* mksearch_encrypt(void* g, void* k, char* _word);
  void* mksearch_adjust(void* g, void* tok, void* delta);
  int mksearch_match(void* g, void* token, void* ciph);
}
