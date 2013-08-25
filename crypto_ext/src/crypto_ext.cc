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
#include "main/b64_wrapper.hh"

using namespace std;

namespace crypto_ext {

  pp::Var MarshallKeygen(const std::string& gs) {
	b64mk bmk = b64mk(gs);
	return pp::Var(bmk.keygen());
  }
  
  pp::Var MarshallDelta(const std::string& gs, const std::string& k1st, const std::string& k2st) {
	b64mk bmk = b64mk(gs);
	return pp::Var(bmk.delta(k1st, k2st));
  }

  pp::Var MarshallToken(const std::string& gs, const std::string& k1s, const std::string& word) {
	b64mk bmk = b64mk(gs);
	return pp::Var(bmk.token(k1s, word));
  }

  pp::Var MarshallEncrypt(const std::string& gs, const std::string& k1s, const std::string& word) {
	b64mk bmk = b64mk(gs);
	return pp::Var(bmk.encrypt(k1s, word));
  }

  pp::Var MarshallAdjust(const std::string& gs, const std::string& tok, const std::string& delta) {
	b64mk bmk = b64mk(gs);
	return pp::Var(bmk.adjust(tok, delta));
  }

  pp::Var MarshallMatch(const std::string& gs, const std::string& tok, const std::string& cipher) {
	b64mk bmk = b64mk(gs);
	return pp::Var(bmk.match(tok, cipher));
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
	if (message.find("test") == 0) {
	  return_var = testJS();
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
