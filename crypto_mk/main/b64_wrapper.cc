#include <main/b64_wrapper.hh>
#include <main/multikey.hh>
#include <main/multikey_sum.hh>
#include <main/ec.hh>
#include <main/base64.h>

using namespace std;



static string
marshall(const ec_point & p) {
    return base64_encode(p.to_bytes());
}

static string
marshall(const ec_scalar & s) {
    return base64_encode(s.to_bytes());
}

static string
marshall(const mksum & mkp, const vector<NTL::ZZ> & s) {
    return base64_encode(mkp.to_bytes(s));
}

static string
marshall(const string & s) {
    return base64_encode(s);
}

static ec_point
unmarshall_delta(mksearch & mk, const string & serial) {
    return mk.from_bytes(base64_decode(serial), ECTYPE::G2);
}

static ec_point
unmarshall_tok(mksearch & mk, const string & serial) {
    return mk.from_bytes(base64_decode(serial), ECTYPE::G1);
}

static ec_scalar
unmarshall_scalar(mksearch & mk, const string & serial) {
    return mk.from_bytes(base64_decode(serial));
}

static string
unmarshall_binary(const string & serial) {
    return base64_decode(serial);
}

static vector<NTL::ZZ>
unmarshall_pkey(mksum & mkp, const string & serial) {
	return mkp.from_bytes(base64_decode(serial));
}

const string params = "ECRQ++V82WnAmHOdN7RQdKTps7NHe86rGhfV0Kx/cRbop6Ued59qM2YInO+y8DuOGO6qqidgujNCrC48SG3oX7Pq77nA6GTlfngovn7WLTRqyhktpggROfGE/YNMysNZsPs8BxEkL5B+EjXHPuIx9KVJY6SORW8E";

b64mk::b64mk() : mk(unmarshall_binary(params)) {}

b64mk::~b64mk() {}

std::string
b64mk::keygen() const {
    return marshall(mk.keygen());
}

std::string
b64mk::delta(const std::string & fromkey, const std::string & tokey)  {
    return marshall(mk.delta(unmarshall_scalar(mk, fromkey),
			     unmarshall_scalar(mk, tokey)));
}

std::string
b64mk::token(const std::string & k, const std::string & word) {
    return marshall(mk.token(unmarshall_scalar(mk, k), word));
}

std::string
b64mk::encrypt(const std::string & k, const std::string & word) {
    return marshall(mk.encrypt(unmarshall_scalar(mk, k), word));
}

std::string
b64mk::index_enc(const std::string & k, const std::string & word) {
    return marshall(mk.index_enc(unmarshall_scalar(mk, k), word));
}

std::string
b64mk::adjust(const std::string & tok, const std::string & delta) {
    return marshall(mk.adjust(unmarshall_tok(mk, tok),
			      unmarshall_delta(mk, delta)));
}

bool
b64mk::match(const std::string & searchtok, const std::string & ciph) {
    return mk.match(unmarshall_binary(searchtok),
		    unmarshall_binary(ciph));
}

std::string
b64mk::pkeygen() const {
	return marshall(mkp, mkp.keygen());
}

std::string
b64mk::pencrypt(const std::string &k, const std::string &word) {
	return marshall(mkp.encrypt(unmarshall_pkey(mkp, k), word));
}

std::string
b64mk::padd(const std::string &k, const std::string &c1, const std::string &c2) {
	return marshall(mkp.add(unmarshall_pkey(mkp, k), unmarshall_binary(c1), unmarshall_binary(c2)));
}

std::string
b64mk::pdecrypt(const std::string &k, const std::string &cipher) {
	return mkp.decrypt(unmarshall_pkey(mkp, k), unmarshall_binary(cipher));
}
