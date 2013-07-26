#include "CryptoServer.h"
#include <string>
#include <map>
#include <stdio.h>
#include <stdlib.h>
#include <fstream>
#include <streambuf>

#include "base64.h"

using namespace std;

static void
parse_args(string argstr, map<string, string> & args) {
  int eq = argstr.find("="), amp = 0;
  string key, value;

  while (eq != -1) {
      key = argstr.substr(amp, eq - amp);
      amp = argstr.find("&", eq) + 1;
      if (amp == 0) {
	  amp = argstr.length();
      }
      value = argstr.substr(eq + 1, amp - eq - 2);
      eq = argstr.find("=", amp);

      args[key] = value;
  }
}

static void
parse_input(const string & request, string & action, map<string, string> & args) {
  string line = request.substr(0, request.find('\n'));

  if (line.find("GET") != 0) {
    action = "";
    cerr << "returning as http was not GET\n";
    return;
  }

  int file = line.find("GET ") + 4;
  int action_end = line.find("?", file);
  action = line.substr(file + 1, action_end - file - 1);

  string args_str = line.substr(action_end + 1,
                     line.find("HTTP") - action_end - 1);

  cerr << "action is " << action << "\n";

  parse_args(args_str, args);

}

static string
get_assert(const map<string, string> & args, string key) {
    auto it = args.find(key);
    if (it == args.end()) {
	cerr << "invalid server request";
	exit(-1); // todo(raluca): don't fail, just return incorrect
    }

    return it->second;		 
}

// TODO(raluca)
// this code should happen in multikey
// as is needed by client side as well


static ec_point
deserialize_ep(const mksearch & mk, const string & d) {
    ec_point p;
    mk.init_tok(p); //TODO(raluca): these inits are not clean
    ec_serializable::from_bytes((void *)d.data(), p);

    return p;
}

static ec_scalar
deserialize_es(const mksearch & mk, const string &d) {
    ec_scalar s;
    mk.init_key(s);
    ec_serializable::from_bytes((void *)d.data(), s);

    return s;
}

static string
marshall(const ec_point & p) {
    return base64_encode(p.stringify());
}

static string
marshall(const ec_scalar & s) {
    return base64_encode(s.stringify());
}

static ec_scalar
unmarshall_es(const mksearch & mk, const string & s) {
    return deserialize_es(mk, base64_decode(s));
}

static ec_point
unmarshall_ep(const mksearch & mk, const string & s) {
    return deserialize_ep(mk, base64_decode(s));
}


static string
keygen(const mksearch & mk, const map<string, string> & args) {
    cerr << "calling keygen\n";
    return marshall(mk.keygen());
}

static string
delta(const mksearch & mk, const map<string, string> & args) {
    ec_scalar k1 = unmarshall_es(mk, get_assert(args, "k1"));
    ec_scalar k2 = unmarshall_es(mk, get_assert(args, "k2"));
    
    return marshall(mk.delta(k1, k2));
}

static string
token(const mksearch & mk, const map<string, string> & args) {
    ec_scalar k = unmarshall_es(mk, get_assert(args, "k"));
    string word = get_assert(args, "word");

    return marshall(mk.token(k, word));
}

static string
encrypt(mksearch & mk, const map<string, string> & args) {
    ec_scalar k = unmarshall_es(mk, get_assert(args, "k"));
    string word = get_assert(args, "word");

    return base64_encode(mk.encrypt(k, word));
}

static string
adjust(const mksearch & mk, const map<string, string> & args) {
    ec_point tok = unmarshall_ep(mk, get_assert(args, "tok"));
    ec_point delta = unmarshall_ep(mk, get_assert(args, "delta"));

    return base64_encode(mk.adjust(tok, delta));
}

static bool
match(const mksearch & mk, const map<string, string> & args) {
    string searchtok = base64_decode(get_assert(args, "searchtok"));
    string ciph = base64_decode(get_assert(args, "ciph"));

    return mk.match(searchtok, ciph);
}



string
CryptoServer::process(const string & request) {

    map<string, string> args;
    string action;
    parse_input(request, action, args);
    
    stringstream resp;
    resp.clear();
    resp << "HTTP/1.0 200 OK\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
    
    if (action == "keygen") {
	resp << keygen(mk, args);
    }
    else if (action == "delta") {
	resp << delta(mk, args);
    }
    else if (action == "token") {
	resp << token(mk, args);
    }
    else if (action == "encrypt") {
	resp << encrypt(mk, args);
    }
    else if (action == "adjust") {
	resp << adjust(mk, args);
    }
    else if (action == "match") {
	resp << match(mk, args);
    } else {
	cerr << "invalid action \n";
    }
    
   
    cerr << "resp is " << resp.str() << "\n===================\n";
    return resp.str();
    
}





