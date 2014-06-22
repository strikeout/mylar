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
      cerr << "line is " << line << " request is " + request + "\n";
      action = "";
      cerr << "returning as http was not GET\n";
      return;
  }

  int file = line.find("GET ") + 4;
  int action_end = line.find("?", file);
  action = line.substr(file + 1, action_end - file - 1);

  string args_str = line.substr(action_end + 1,
                     line.find("HTTP") - action_end - 1);

  if (VERB) cerr << "action is " << action << "\n";

  parse_args(args_str, args);

}

static string
get_assert(const map<string, string> & args, string key) {
    auto it = args.find(key);
    if (it == args.end()) {
	if (VERB) cerr << "invalid server request";
	throw new MKError("invalid parameters");
    }

    return it->second;		 
}

static string
keygen(b64mk & mk, const map<string, string> & args) {
    return mk.keygen();
}

static string
delta(b64mk & mk, const map<string, string> & args) {
    return mk.delta(get_assert(args, "k1"),
		    get_assert(args, "k2"));
}

static string
token(b64mk & mk, const map<string, string> & args) {
    return mk.token(get_assert(args, "k"),
		    get_assert(args, "word"));
}

static string
encrypt(b64mk & mk, const map<string, string> & args) {
    return mk.encrypt(get_assert(args, "k"),
		      get_assert(args, "word"));
}

static string
index_enc(b64mk & mk, const map<string, string> & args) {
    return mk.index_enc(get_assert(args, "k"),
			get_assert(args, "word"));
}


static string
adjust(b64mk & mk, const map<string, string> & args) {
    return mk.adjust(get_assert(args, "tok"),
		     get_assert(args, "delta"));
}

static bool
match(b64mk & mk, const map<string, string> & args) {
    return mk.match(get_assert(args, "searchtok"),
		    get_assert(args, "ciph"));
}

static string
pkeygen(b64mk & mk, const map<string, string> & args) {
    return mk.pkeygen();
}

static string
ppubkey(b64mk & mk, const map<string, string> & args) {
    return mk.ppubkey(get_assert(args, "k"));
}

static string
pencrypt(b64mk & mk, const map<string, string> & args) {
    return mk.pencrypt(get_assert(args, "pk"),
					   get_assert(args, "plain"));
}

static string
padd(b64mk & mk, const map<string, string> & args) {
    return mk.padd(get_assert(args, "pk"),
				   get_assert(args, "c1"),
				   get_assert(args, "c2"));
}

static string
pdecrypt(b64mk & mk, const map<string, string> & args) {
    return mk.pdecrypt(get_assert(args, "k"),
					   get_assert(args, "cipher"));
}

string
CryptoServer::process(const string & request) {

    map<string, string> args;
    string action;
    parse_input(request, action, args);
    
    stringstream resp;
    resp.clear();
    resp << "HTTP/1.0 200 OK\r\nAccess-Control-Allow-Origin: *\r\n\r\n";

    try {
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
	else if (action == "index_enc") {
	    resp << index_enc(mk, args);
	}
	else if (action == "adjust") {
	    resp << adjust(mk, args);
	}
	else if (action == "match") {
	    resp << match(mk, args);
	}
	else if (action == "pkeygen") {
	    resp << pkeygen(mk, args);
	}
	else if (action == "ppubkey") {
	    resp << ppubkey(mk, args);
	}
	else if (action == "pencrypt") {
	    resp << pencrypt(mk, args);
	}
	else if (action == "padd") {
	    resp << padd(mk, args);
	}
	else if (action == "pdecrypt") {
	    resp << pdecrypt(mk, args);
	} else {
	    cerr << "invalid action " + action + " \n";
	    resp.clear();
	    resp << "HTTP/1.0 406 Not Acceptable\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
	    return resp.str();
	}
    } catch(MKError cs) {
	cerr << "issue with request";
	resp.clear();
	resp << "HTTP/1.0 406 Not Acceptable\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
	return resp.str();
    }
    
    if (VERB) cerr << "resp is " << resp.str() << "\n===================\n";
    return resp.str();
    
}





