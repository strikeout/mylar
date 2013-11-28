#include <util/util.hh>

#include <iostream>
#include <sys/time.h>
#include <main/prng.hh>
#include <main/multikey.hh>
#include <main/b64_wrapper.hh>
#include <main/ec.hh>

#include<vector>
#include <list>

using namespace std;

static vector<string>
get_words(uint num) {
    vector<string> res;
    urandom u;
    for (uint i = 0; i < num; i++) {
	res.push_back(u.rand_string(16));
    }

    return res;
}

static void
test_MK() {
    cerr << "testing mksearch ... ";
    uint num_keys = 10;
    uint num_words = 10;
    
    vector<string> words = get_words(num_words);

    mksearch mk;

    ec_scalar k = mk.keygen();
    ec_scalar keys[num_keys];
    ec_point deltas[num_keys];
    string ciph[num_keys][num_words];

    for (uint i = 0; i < num_keys; i++) {
	ec_scalar kk = mk.keygen();
	keys[i] = kk;
	deltas[i] = mk.delta(k, kk);
	
	for (uint j = 0; j < num_words; j++) {
	    ciph[i][j] = mk.encrypt(kk, words[j]);
	}
    }

    // check ciphertexts are different
    if (num_keys > 1) {
	for (uint j = 0; j < num_words; j++) {
	    assert_s(ciph[0][j] != ciph[1][j], " should be different");
	}
    }

    // check words encrypted can be found

    for (uint i = 0; i < num_keys; i++) {
    
	for (uint j = 0; j < num_words; j++) {
	    // the word we search for
	    string word_to_search = words[j];
	    ec_point token = mk.token(k, word_to_search);
	    string search_token = mk.adjust(token, deltas[i]);

	    for (uint k = 0; k < num_words; k++) {
		if (word_to_search == words[k]) {
		    assert_s(mk.match(search_token, ciph[i][k]), "should have matched");
		} else {
		    assert_s(!mk.match(search_token, ciph[i][k]), "should not have matched");
		}
	    }
	}
    }

    cout << "OK!\n";
  
}

static void
test_b64MK() {
    cerr << "testing b64 wrapper for multi-key ... ";
    uint num_keys = 10;
    uint num_words = 10;
    
    vector<string> words = get_words(num_words);

    b64mk mk;

    string k = mk.keygen();
    string keys[num_keys];
    string deltas[num_keys];
    string ciph[num_keys][num_words];

    for (uint i = 0; i < num_keys; i++) {
	string kk = mk.keygen();
	keys[i] = kk;
	deltas[i] = mk.delta(k, kk);
	
	for (uint j = 0; j < num_words; j++) {
	    ciph[i][j] = mk.encrypt(kk, words[j]);
	}
    }

    // check ciphertexts are different
    if (num_keys > 1) {
	for (uint j = 0; j < num_words; j++) {
	    assert_s(ciph[0][j] != ciph[1][j], " should be different");
	}
    }

    // check words encrypted can be found

    for (uint i = 0; i < num_keys; i++) {
    
	for (uint j = 0; j < num_words; j++) {
	    // the word we search for
	    string word_to_search = words[j];
	    string token = mk.token(k, word_to_search);
	    string search_token = mk.adjust(token, deltas[i]);

	    for (uint k = 0; k < num_words; k++) {
		if (word_to_search == words[k]) {
		    assert_s(mk.match(search_token, ciph[i][k]), "should have matched");
		    assert_s(mk.match(mk.index_enc(keys[i], word_to_search), ciph[i][k]),
			     "index enc does not match"); 
		} else {
		    assert_s(!mk.match(search_token, ciph[i][k]), "should not have matched");
		    assert_s(!mk.match(mk.index_enc(keys[i], word_to_search), ciph[i][k]),
			     "index enc matches when it shouldn't"); 
				    
		}
	    }
	}
    }

    cout << "OK\n";
  
}

static void
test() {
    test_MK();
    test_b64MK();
    cerr << "Tests passed.\n";
}
static void p(uint64_t v, uint num_words, string s) {
    cerr << s << ": " << v/(1000.0 * num_words) << " ms \n";
}

static void
bench(int ac, char **av) {
    cerr << "benchmark: \n";

    if (ac != 2) {
	cerr << "usage : ./test num_words \n";
	exit(-1);
    }
    uint num_words = atoi(av[1]);
    
    vector<string> words = get_words(num_words);

    mksearch mk;

    ec_scalar k = mk.keygen();
    ec_scalar kk = mk.keygen();

    Timer t;

    //encrypt 
    vector<string> ciph = vector<string>(num_words);

    t.lap();

    for (uint i = 0; i < num_words; i++) {
	ciph[i] = mk.encrypt(kk, words[i]);
    }

    p(t.lap(), num_words, "encrypt");

    ec_point d;

    t.lap();
    
    // time to compute delta
    for (uint i = 0; i < num_words; i++) {
	d = mk.delta(k, kk);
	if (i  && i % 493280 == 0) {
	    cerr << "d " << d.pretty() << "\n";
	}
    }

    p(t.lap(), num_words, "delta");

    t.lap();
    
    for (uint i = 0; i < num_words; i++) {
	ec_point token = mk.token(k, words[i]);

	if (i && i % 493280 == 0) {
	    cerr << "t " << token.pretty() << "\n";
	}
    }

    p(t.lap(), num_words, "token");

    ec_point token = mk.token(k, words[0]);
    string stoken;
    
    t.lap();

    for (uint i = 0; i < num_words; i++) {
	stoken = mk.adjust(token, d);
	if (i && i % 398420 == 0) {
	    cerr << "stoken " << stoken << "\n";
	}
    }

    p(t.lap(), num_words, "adjust");

    uint count = 0;
    t.lap();

    for (uint i = 0; i < num_words; i++) {
	count += mk.match(stoken, ciph[i]);
    }

    p(t.lap(), num_words, "search: ");
    assert_s(count == 1, "incorrect search results");

}


static void
bench_b64(int ac, char **av) {
    cerr << "benchmark: \n";

    if (ac != 2) {
	cerr << "usage : ./test num_words \n";
	exit(-1);
    }
    uint num_words = atoi(av[1]);
    
    vector<string> words = get_words(num_words);

    b64mk mk;

    string k = mk.keygen();
    string kk = mk.keygen();

    Timer t;

    //encrypt 
    vector<string> ciph = vector<string>(num_words);

    t.lap();

    for (uint i = 0; i < num_words; i++) {
	ciph[i] = mk.encrypt(kk, words[i]);
    }

    p(t.lap(), num_words, "encrypt");

    string d;

    t.lap();
    
    // time to compute delta
    for (uint i = 0; i < num_words; i++) {
	d = mk.delta(k, kk);
	if (i  && i % 493280 == 0) {
	    cerr << "d " << d << "\n";
	}
    }

    p(t.lap(), num_words, "delta");

    t.lap();
    
    for (uint i = 0; i < num_words; i++) {
	string token = mk.token(k, words[i]);

	if (i && i % 493280 == 0) {
	    cerr << "t " << token << "\n";
	}
    }

    p(t.lap(), num_words, "token");

    string token = mk.token(k, words[0]);
    string stoken;
    
    t.lap();

    for (uint i = 0; i < num_words; i++) {
	stoken = mk.adjust(token, d);
	if (i && i % 398420 == 0) {
	    cerr << "stoken " << stoken << "\n";
	}
    }

    p(t.lap(), num_words, "adjust");

    uint count = 0;
    t.lap();

    for (uint i = 0; i < num_words; i++) {
	count += mk.match(stoken, ciph[i]);
    }

    p(t.lap(), num_words, "search: ");
    assert_s(count == 1, "incorrect search results");

}

int
main(int ac, char **av)
{
    bool benchf = true;
    if (!benchf) test();
    if (benchf) bench_b64(ac, av);
    if (!benchf) bench(ac, av);
}
