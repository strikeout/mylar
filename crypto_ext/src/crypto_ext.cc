#include <cstdio>
#include <cstring>
#include <string>
#include <iostream>
#include <sstream>
#include <fstream>
#include <cstdlib>
#include "ppapi/cpp/instance.h"
#include "ppapi/cpp/module.h"
#include "ppapi/cpp/var.h"
#include "base64.h"
#include "crypto_helper.h"

using namespace std;

namespace crypto_ext {

  void* fromSVar(std::string d) {
	std::string code = d.substr(0, d.find(':'));
	std::string lens = d.substr(d.find(':') + 1);
	//std::cerr << "Input: " << d << "\n";
	//cerr << "Code: " << code << "\n";
	//cerr << "Len: " << lens << "\n";


	int olen = atoi(lens.c_str());
	//cerr << "OLen: " << olen << "\n";
	int len;
	return unbase64(code.c_str(), olen, &len);
  }

  void* fromVar(pp::Var v) {
	return fromSVar(v.AsString());
  }
  pp::Var toVar(void* v, int l) {
	int len;
	std::stringstream x;
	x.clear();
	x << base64(v, l, &len) << ":";
	x << len;
	//cerr << "tv L: " << l << "\n";
	return pp::Var(x.str());
  }

  pp::Var MarshallNew() {
	mksearch mk = mksearch();
	int olen;
	void* result = mk.serializeLen(&olen);
	return toVar(result, olen);
  }

  pp::Var MarshallKeygen(const std::string& gs) {
	int len;
	mksearch mk = mksearch((unsigned char*)fromSVar(gs));
	void* result;
	int olen = mk.keygen().to_bytes(&result);
	return toVar(result, olen);
  }
  
  pp::Var MarshallDelta(const std::string& gs, const std::string& k1st, const std::string& k2st) {
	int len;
	mksearch mk = mksearch((unsigned char*)fromSVar(gs));
	ec_scalar k1s, k2s;
	mk.init_key(k1s);
	mk.init_key(k2s);
	ec_serializable::from_bytes(fromSVar(k1st), k1s);
	ec_serializable::from_bytes(fromSVar(k2st), k2s);
	void* result;
	int olen = mk.delta(k1s, k2s).to_bytes(&result);
	return toVar(result, olen);
  }

  pp::Var MarshallToken(const std::string& gs, const std::string& k1s, const std::string& word) {
	int len;
	mksearch mk = mksearch((unsigned char*)fromSVar(gs));
	ec_scalar ks;
	mk.init_key(ks);
	ec_serializable::from_bytes(fromSVar(k1s), ks);
	void* result;
	int olen = mk.token(ks, word).to_bytes(&result);
	return toVar(result, olen);
  }

  pp::Var MarshallEncrypt(const std::string& gs, const std::string& k1s, const std::string& word) {
	int len;
	mksearch mk = mksearch((unsigned char*)fromSVar(gs));
	ec_scalar ks;
	mk.init_key(ks);
	ec_serializable::from_bytes(fromSVar(k1s), ks);
	std::string result = mk.encrypt(ks, word);
	return toVar((void*)result.data(), result.size());
  }

  pp::Var MarshallAdjust(const std::string& gs, const std::string& tok, const std::string& delta) {
	int len;
	mksearch mk = mksearch((unsigned char*)fromSVar(gs));
	ec_point tokpt, deltapt;
	mk.init_tok(tokpt);
	mk.init_tok(deltapt);
	ec_serializable::from_bytes(fromSVar(tok), tokpt);
	ec_serializable::from_bytes(fromSVar(delta), deltapt);
	std::string result = mk.adjust(tokpt, deltapt);
	return toVar((void*)result.data(), result.size());
  }

  pp::Var MarshallMatch(const std::string& gs, const std::string& tok, const std::string& cipher) {
	return pp::Var(mksearch_match(fromSVar(gs), fromSVar(tok), fromSVar(cipher)) != 0);
  }  

  pp::Var testC() {
	std::string output = "";
    output += "testing multi-key ... \n";
    uint num_keys = 10;
    uint num_words = 10;
	std::string words[10] = {"APPLE","BOB","DOOR","CAT", "ERROL","ZOO", "GOAT", "ZEBRA", "HOUSE", "CRYPTDB"};

	mksearch mk = mksearch();
	void *g;
	g = mk.serialize();

	void *k = mksearch_keygen(g);

	void* keys[num_keys];
	void* deltas[num_keys];
	void* ciph[num_keys][num_words];
    for (uint i = 0; i < num_keys; i++) {
	  void* kk = mksearch_keygen(g);
	  keys[i] = kk;

	  void* deltak = mksearch_delta(g, k, kk);
	  deltas[i] = deltak;

	  for (uint j = 0; j < num_words; j++) {
		ciph[i][j] = mksearch_encrypt(g, kk, (char*)words[j].c_str());
	  }
    }
    if (num_keys > 1) {
	  for (uint j = 0; j < num_words; j++) {
	    if(ciph[0][j] == ciph[1][j]) {
		  output += std::string((char*)ciph[0][j]) + " should be different from " + std::string((char*)ciph[1][j]) + "\n";
		}
	  }
    }

    for (uint i = 0; i < num_keys; i++) {
	  for (uint j = 0; j < num_words; j++) {
		std::string word_to_search = words[j];

		void* token = mksearch_token(g, k, (char*)word_to_search.data());
		void* search_token = mksearch_adjust(g, token, deltas[i]);

	    for (uint k = 0; k < num_words; k++) {
		  if (word_to_search == words[k]) {
		    if(!mksearch_match(g, search_token, ciph[i][k])) {
			  output += std::string((char*)search_token) + " should have matched " + std::string((char*)ciph[i][k]) + "\n";
			}
		  } else {
			if(mksearch_match(g, search_token, ciph[i][k])) {
			  output += std::string((char*)search_token) + " should not have matched " + std::string((char*)ciph[i][k]) + "\n";
			}
		  }
	    }
	  }
    }
	cerr << output << "\n\n";
    return pp::Var(output);
  }

  pp::Var testJS() {
	std::string output = "";
    output += "testing multi-key ... \n";
    uint num_keys = 10;
    uint num_words = 10;
	std::string words[10] = {"APPLE","BOB","DOOR","CAT", "ERROL","ZOO", "GOAT", "ZEBRA", "HOUSE", "CRYPTDB"};
	pp::Var g = MarshallNew();
	pp::Var k = MarshallKeygen(g.AsString());
	pp::Var keys[num_keys];
	pp::Var deltas[num_keys];
	pp::Var ciph[num_keys][num_words];
    for (uint i = 0; i < num_keys; i++) {
	  pp::Var kk = MarshallKeygen(g.AsString());
	  keys[i] = kk;
	  deltas[i] = MarshallDelta(g.AsString(), k.AsString(), kk.AsString());
	  for (uint j = 0; j < num_words; j++) {
		ciph[i][j] = MarshallEncrypt(g.AsString(), kk.AsString(), words[j]);
	  }
    }
    if (num_keys > 1) {
	  for (uint j = 0; j < num_words; j++) {
	    if(ciph[0][j] == ciph[1][j]) {
		  output += ciph[0][j].AsString() + " should be different from " + ciph[1][j].AsString() + "\n";
		}
	  }
    }
    for (uint i = 0; i < num_keys; i++) {
	  for (uint j = 0; j < num_words; j++) {
		std::string word_to_search = words[j];
		pp::Var token = MarshallToken(g.AsString(), k.AsString(), word_to_search);
		pp::Var search_token = MarshallAdjust(g.AsString(), token.AsString(), deltas[i].AsString());
	    for (uint k = 0; k < num_words; k++) {
		  if (word_to_search == words[k]) {
		    if(!MarshallMatch(g.AsString(), search_token.AsString(), ciph[i][k].AsString()).AsBool()) {
			  output += search_token.AsString() + " should have matched " + ciph[i][k].AsString() + "\n";
			}
		  } else {
		    if(MarshallMatch(g.AsString(), search_token.AsString(), ciph[i][k].AsString()).AsBool()) {
			  output += search_token.AsString() + " should not have matched " + ciph[i][k].AsString() + "\n";
			}
		  }
	    }
	  }
    }
	cerr << output << "\n\n";
    return pp::Var(output);
  }

  pp::Var testHybrid() {
	std::string output = "";
    output += "testing multi-key ... \n";
    uint num_keys = 10;
    uint num_words = 10;
	std::string words[10] = {"APPLE","BOB","DOOR","CAT", "ERROL","ZOO", "GOAT", "ZEBRA", "HOUSE", "CRYPTDB"};
	pp::Var g = MarshallNew();
	pp::Var k = MarshallKeygen(g.AsString());
	pp::Var keys[num_keys];
	pp::Var deltas[num_keys];
	pp::Var ciph[num_keys][num_words];
    for (uint i = 0; i < num_keys; i++) {
	  pp::Var kk = MarshallKeygen(g.AsString());
	  keys[i] = kk;
	  deltas[i] = MarshallDelta(g.AsString(), k.AsString(), kk.AsString());
	  for (uint j = 0; j < num_words; j++) {
		ciph[i][j] = MarshallEncrypt(g.AsString(), kk.AsString(), words[j]);
	  }
    }
    if (num_keys > 1) {
	  for (uint j = 0; j < num_words; j++) {
	    if(ciph[0][j] == ciph[1][j]) {
		  output += ciph[0][j].AsString() + " should be different from " + ciph[1][j].AsString() + "\n";
		}
	  }
    }

    for (uint i = 0; i < num_keys; i++) {
	  for (uint j = 0; j < num_words; j++) {
		std::string word_to_search = words[j];
		pp::Var token = MarshallToken(g.AsString(), k.AsString(), word_to_search);
		pp::Var search_token = MarshallAdjust(g.AsString(), token.AsString(), deltas[i].AsString());
	    for (uint k = 0; k < num_words; k++) {
		  if (word_to_search == words[k]) {
		    if(!MarshallMatch(g.AsString(), search_token.AsString(), ciph[i][k].AsString()).AsBool()) {
		  	  output += search_token.AsString() + " should have matched " + ciph[i][k].AsString() + "\n";
		  	}
		  } else {
		    if(MarshallMatch(g.AsString(), search_token.AsString(), ciph[i][k].AsString()).AsBool()) {
		  	  output += search_token.AsString() + " should not have matched " + ciph[i][k].AsString() + "\n";
		  	}
		  }
	    }
	  }
    }

	cerr << output << "\n\n";
    return pp::Var(output);
  }

  class CryptoInstance : public pp::Instance {
  public:
	explicit CryptoInstance(PP_Instance instance) : pp::Instance(instance) {
	  printf("Creating CryptoInstance.\n");
	}
	virtual ~CryptoInstance() {}
	virtual void HandleMessage(const pp::Var& var_message);
  };
  
  void CryptoInstance::HandleMessage(const pp::Var& var_message) {
	if (!var_message.is_string()) {
	  return;
	}
	std::string message = var_message.AsString();

	cerr << "Message for request '" << message << "':\n";

	pp::Var return_var;
	// searchToken(GGGGG,KKKK, WORD)
	if (message.find("testC") == 0) {
	  return_var = testC();
	} else if (message.find("testJ") == 0) {
	  return_var = testJS();
	} else if (message.find("testH") == 0) {
	  return_var = testHybrid();
	} else if (message.find("new") == 0) {
	  return_var = MarshallNew();
	} else if (message.find("keygen") == 0) {
	  message = message.substr(7);
	  size_t e_c = message.find(')');

	  if (e_c != std::string::npos) {
		std::string gs = message.substr(0, e_c);
		return_var = MarshallKeygen(gs);
	  }
	} else if (message.find("delta") == 0) {
	  message = message.substr(6);
	  size_t f_c = message.find(',');
	  size_t s_c = message.find(',', f_c + 1);
	  size_t e_c = message.find(')');
	  
	  if (f_c != std::string::npos && s_c != std::string::npos && e_c != std::string::npos) {
		std::string gs = message.substr(0, f_c);
		std::string k1st = message.substr(f_c + 1, s_c);
		std::string k2st = message.substr(s_c + 1, e_c);
		return_var = MarshallDelta(gs, k1st, k2st);
	  }
	} else if (message.find("token") == 0) {
	  message = message.substr(6);
	  size_t f_c = message.find(',');
	  size_t s_c = message.find(',', f_c + 1);
	  size_t e_c = message.find(')');
	  
	  if (f_c != std::string::npos && s_c != std::string::npos && e_c != std::string::npos) {
		std::string gs = message.substr(0, f_c);
		std::string k1s = message.substr(f_c + 1, s_c);
		std::string word = message.substr(s_c + 1, e_c);
		return_var = MarshallToken(gs, k1s, word);
	  }
	} else if (message.find("encrypt") == 0) {
	  message = message.substr(8);
	  size_t f_c = message.find(',');
	  size_t s_c = message.find(',', f_c + 1);
	  size_t e_c = message.find(')');
	  
	  if (f_c != std::string::npos && s_c != std::string::npos && e_c != std::string::npos) {
		std::string gs = message.substr(0, f_c);
		std::string k1s = message.substr(f_c + 1, s_c);
		std::string word = message.substr(s_c + 1, e_c);
		return_var = MarshallEncrypt(gs, k1s, word);
	  }
	} else if (message.find("adjust") == 0) {
	  message = message.substr(6);
	  size_t f_c = message.find(',');
	  size_t s_c = message.find(',', f_c + 1);
	  size_t e_c = message.find(')');
	  
	  if (f_c != std::string::npos && s_c != std::string::npos && e_c != std::string::npos) {
		std::string gs = message.substr(0, f_c);
		std::string tok = message.substr(f_c + 1, s_c);
		std::string delta = message.substr(s_c + 1, e_c);
		return_var = MarshallAdjust(gs, tok, delta);
	  }
	} else if (message.find("match") == 0) {
	  message = message.substr(6);
	  size_t f_c = message.find(',');
	  size_t s_c = message.find(',', f_c + 1);
	  size_t e_c = message.find(')');
	  
	  if (f_c != std::string::npos && s_c != std::string::npos && e_c != std::string::npos) {
		std::string gs = message.substr(0, f_c);
		std::string tok = message.substr(f_c + 1, s_c);
		std::string cipher = message.substr(s_c + 1, e_c);
		return_var = MarshallMatch(gs, tok, cipher);
	  }
	}
	PostMessage(return_var);
  }
  class CryptoModule : public pp::Module {
  public:
	CryptoModule() : pp::Module() {
	  printf("Creating CryptoModule.\n");
	}
	virtual ~CryptoModule() {}

	virtual pp::Instance* CreateInstance(PP_Instance instance) {
	  return new CryptoInstance(instance);
	}
  };
}

namespace pp {
  Module* CreateModule() {
	return new crypto_ext::CryptoModule();
  }
}
