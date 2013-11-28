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

    b64mk bmk;
    
  pp::Var MarshallKeygen() {
	return pp::Var(bmk.keygen());
  }
  
  pp::Var MarshallDelta(const std::string& k1st, const std::string& k2st) {
	return pp::Var(bmk.delta(k1st, k2st));
  }

  pp::Var MarshallToken(const std::string& k1s, const std::string& word) {
	return pp::Var(bmk.token(k1s, word));
  }

  pp::Var MarshallEncrypt(const std::string& k1s, const std::string& word) {
	return pp::Var(bmk.encrypt(k1s, word));
  }

  pp::Var MarshallAdjust( const std::string& tok, const std::string& delta) {
	return pp::Var(bmk.adjust(tok, delta));
  }

  pp::Var MarshallMatch( const std::string& tok, const std::string& cipher) {
	return pp::Var(bmk.match(tok, cipher));
  }  

  pp::Var testJS() {
      std::string output = "";
      output += "testing multi-key ... \n";
      uint num_keys = 10;
      uint num_words = 10;
      std::string words[10] = {"APPLE","BOB","DOOR","CAT", "ERROL","ZOO", "GOAT", "ZEBRA", "HOUSE", "CRYPTDB"};
      pp::Var k = MarshallKeygen();
      pp::Var keys[num_keys];
      pp::Var deltas[num_keys];
      pp::Var ciph[num_keys][num_words];
      for (uint i = 0; i < num_keys; i++) {
	  pp::Var kk = MarshallKeygen();
	  keys[i] = kk;
	  deltas[i] = MarshallDelta(k.AsString(), kk.AsString());
	  for (uint j = 0; j < num_words; j++) {
	      ciph[i][j] = MarshallEncrypt(kk.AsString(), words[j]);
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
	    pp::Var token = MarshallToken(k.AsString(), word_to_search);
	    pp::Var search_token = MarshallAdjust(token.AsString(), deltas[i].AsString());
	    for (uint k = 0; k < num_words; k++) {
		if (word_to_search == words[k]) {
		    if(!MarshallMatch(search_token.AsString(), ciph[i][k].AsString()).AsBool()) {
			output += search_token.AsString() + " should have matched " + ciph[i][k].AsString() + "\n";
		    }
		} else {
		    if(MarshallMatch(search_token.AsString(), ciph[i][k].AsString()).AsBool()) {
			output += search_token.AsString() + " should not have matched " + ciph[i][k].AsString() + "\n";
		    }
		}
	    }
	}
    }
    cerr << output << " (if no error then ok) \n\n";
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

    static string
    prepare_msg(string & message) {
	for (uint i = 0; i < message.length(); i++) {
	    char c = message[i];
	    if (c == ',' || c == ')' || c=='(') {
		message[i] = ' ';
	    }
	}
    }
    
    static pp::Var
    dispatch(const string & message) {
	
	cerr << "Message for request '" << message << "':\n";

	stringstream msg(message);
	string msg_type;
	msg >> msg_type;

	if (msg_type == "test") {
	    return testJS();
	}
	
	if (msg_type == "keygen") {
	    return MarshallKeygen();
	}

	if (msg_type == "delta") {
	    string k1, k2;
	    msg >> k1 >> k2;
	    return  MarshallDelta(k1, k2);
	}

	if (msg_type == "token") {
	    string k1, word;
	    msg >> k1 >> word;
	    return MarshallToken(k1, word);
	}
	
	if (msg_type == "encrypt") {
	    string k1, word;
	    msg >> k1 >> word;
	    return MarshallEncrypt(k1, word);
	}
	
	if (msg_type == "adjust") {
	    string tok, delta;
	    msg >> tok >> delta;
	    return MarshallAdjust(tok, delta);
	}

	if (msg_type == "match") {
	    string tok, cipher;
	    msg >> tok >> cipher;
	    return MarshallMatch(tok, cipher);
	}

	return "";

    }
    
  void CryptoInstance::HandleMessage(const pp::Var& var_message) {
	if (!var_message.is_string()) {
	  return;
	}

	string message = var_message.AsString();
	PostMessage(dispatch(message));
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
