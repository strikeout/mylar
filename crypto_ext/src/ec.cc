#include <pbc/pbc.h>
#include <iostream>
#include "ec.hh"
#include "sha.hh"

using namespace std;

string
ec_serializable::stringify(int truncate) {
    int size = element_length_in_bytes(e);
    unsigned char data[size];
    if(element_to_bytes(data, e) != size) {
	  cerr << "ERROR: incorrect serialization\n";
	  throw "incorrect serialization";
	}
    return string((const char *)data, truncate ? truncate : size);
}

int
ec_serializable::to_bytes(void** output) {
    int size = element_length_in_bytes(e);
    *output = malloc(size);
    element_to_bytes((unsigned char*) *output, e);
	return size;
}

// output and output.e MUST be initialized
void
ec_serializable::from_bytes(void* ser, ec_serializable &output) {
    element_from_bytes(output.e, (unsigned char*) ser);
}

static element_ptr
eccopy(const element_ptr & e) {
    element_ptr r = new element_s();
    element_init_same_as(r, e);
    element_set(r, e);
    return r;
}

ec_scalar::ec_scalar(const element_ptr & _e) {
    e = eccopy(_e);
}

ec_scalar::ec_scalar() {
    e = NULL;
}


ec_scalar::~ec_scalar() {
    if (e) {
        element_clear(e);
    }
}

void
ec_scalar::operator=(const ec_scalar & p) {
    e = eccopy(p.e);
}

ec_scalar
ec_scalar::operator/(const ec_scalar & s) const {
    element_ptr n =  new element_s();
    element_init_same_as(n, s.e);
    
    element_div(n, e, s.e);
    
    return ec_scalar(n);
}

ec_point::ec_point(){ e = NULL; }

ec_point::ec_point(const element_ptr &  _e) {
    e = eccopy(_e);
}

void
ec_point::operator=(const ec_point & p) {
    e = eccopy(p.e);
}


ec_point::~ec_point() {
    if (e) {
        element_clear(e);
    }
}

ec_point
ec_point::operator^(const ec_scalar & s) const {
    element_ptr pow = new element_s();
    element_init_same_as(pow, e);
    
    element_pow_zn(pow, e, s.e);
    
    return ec_point(pow);
}

EC::EC() {
    char param[360]="type a\nq 8780710799663312522437781984754049815806883199414208211028653399266475630880222957078625179422662221423155858769582317459277713367317481324925129998224791\nh 12016012264891146079388821366740534204802954401251311822919615131047207289359704531102844802183906537786776\nr 730750818665451621361119245571504901405976559617\nexp2 159\nexp1 107\nsign1 1\nsign0 1\0";
    param[359] = '\0';

    pairing = new pairing_s();
    pairing_init_set_buf(pairing, param, 359);
    
    if(!(SEEDSIZE < CTSIZE && CTSIZE <= SEEDSIZE + (int)sha1::hashsize)) {
	  cerr << "ERROR: CTSIZE sanity check failed\n";
	  throw "CTSIZE sanity check failed";
	}
}

EC::~EC() {
    pairing_clear(pairing);
}

void
EC::elem_init_G2(element_ptr e) {
    element_init_G2(e, pairing);
}

void
EC::elem_init_Zr(element_ptr e) {
    element_init_Zr(e, pairing);
}

ec_point
EC::sample_G2()  {
    element_ptr e = new element_s();
    element_init_G2(e, pairing);
    element_random(e);
    return ec_point(e);
}

ec_scalar
EC::sample_scalar() {
    element_ptr e = new element_s();
    element_init_Zr(e, pairing);
    element_random(e);
    
    return ec_scalar(e);
}


ec_point
EC::hash(const std::string & s) {
    element_ptr hp = new element_s();
    element_init_G1(hp, pairing);
    
    std::string h = sha1::hash(s);
    element_from_hash(hp, (void *)h.c_str(), h.size());
    
    return ec_point(hp);   
}

string
ec_point::pretty() {
    uint sz = 20000;
    char * buf = new char[sz];
    int actualsz = element_snprintf(buf, sz, "%B", e);
    return string(buf, actualsz);
}

ec_point
EC::pair(const ec_point & p1, const ec_point & p2) {
    element_ptr res = new element_s();
    element_init_GT(res, pairing);
    
    pairing_apply(res, p1.e, p2.e, pairing);
    
    return ec_point(res);
}

string
EC::xor_pattern (const ec_point & n) {
    int size = element_length_in_bytes(n.e);

    if(size < CTSIZE) {
	  cerr << "ERROR: size of point is smaller than ciphertext size\n";
	  throw "size of point is smaller than ciphertext size";
	}
    unsigned char data[size];
    
    if(element_to_bytes(data, n.e) != size) {
	  cerr << "ERROR: incorrect serialization\n";
	  throw "incorrect serialization";
	}

	std::string result;
    result.resize(SEEDSIZE);

    for (int i = 0; i < SEEDSIZE; i++)
	  result[i] = (char)(rand() % 256);

    
    std::string seed = result;
    std::string hseed = sha1::hash(seed);
    
    std::string res;
    for (int i = 0; i < CTSIZE; i++) {
	unsigned char c; 
	if (i < SEEDSIZE) {
	    c = seed[i];
	} else {
	    c = hseed[i-SEEDSIZE];
	}
	res += data[i]^c;
    }
    
    return res;
}

bool
EC::has_pattern(const string & tok, const string & ciph) {
    string tmp;
    if(tok.size() != ciph.size()) {
	  cerr << "ERROR: inconsistent tok/ciph sizes\n";
	  throw "inconsistent tok/ciph sizes";
	}
    for (uint i = 0; i < tok.size(); i++) {
	tmp += tok[i]^ciph[i];
    }
    
    std::string seed = tmp.substr(0, SEEDSIZE);
    std::string hseed = sha1::hash(seed);
    
    return (hseed.substr(0, CTSIZE-SEEDSIZE) == tmp.substr(SEEDSIZE, CTSIZE-SEEDSIZE));
}
