#include <main/b64_wrapper.hh>
#include <main/multikey.hh>
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

