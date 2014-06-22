#include "main/multikey_sum.hh"

#include "NTL/ZZ.h"
#include "pbc/pbc.h"
#include "main/sha.hh"

#include <util/util.hh>

using namespace std;

static inline NTL::ZZ
L(const NTL::ZZ &u, const NTL::ZZ &n)
{
    return (u - 1) / n;
}

static inline NTL::ZZ
Lfast(const NTL::ZZ &u, const NTL::ZZ &ninv, const NTL::ZZ &two_n, const NTL::ZZ &n)
{
    return (((u - 1) * ninv) % two_n) % n;
}

static inline NTL::ZZ
LCM(const NTL::ZZ &a, const NTL::ZZ &b)
{
    return (a * b) / GCD(a, b);
}

mksum::mksum() {
}

mksum::~mksum() {
}

static urandom u;

static NTL::ZZ
rand_zz_nbits(size_t nbits) {
    if (nbits == 0)
        return NTL::to_ZZ(0);

    uint8_t buf[(nbits + 7) / 8];
    u.rand_bytes(sizeof(buf), buf);

	NTL::ZZ r = NTL::ZZFromBytes(buf, sizeof(buf));
    SetBit(r, nbits - 1);
    return r;
}

vector<NTL::ZZ>
mksum::keygen() const {
	uint nbits = 1024;
	uint abits = 256;

	NTL::ZZ p, q, n, g, a;

    do {
		cerr << "Doing loop." << endl;
        if (abits) {
			for (;;) {
				a = rand_zz_nbits(abits);
				SetBit(a, 0);
				
				if (ProbPrime(a, 10))
					break;
			}

			NTL::ZZ cp = rand_zz_nbits(nbits/2-abits);
			NTL::ZZ cq = rand_zz_nbits(nbits/2-abits);

            p = a * cp + 1;
            while (!ProbPrime(p))
                p += a;

            q = a * cq + 1;
            while (!ProbPrime(q))
                q += a;
        } else {
            a = 0;
			for (;;) {
				p = rand_zz_nbits(nbits/2);
				SetBit(p, 0);
				
				if (ProbPrime(p, 10))
					break;
			}
			for (;;) {
				q = rand_zz_nbits(nbits/2);
				SetBit(q, 0);
				
				if (ProbPrime(q, 10))
					break;
			}
        }
        n = p * q;
		cerr << "Numbits: " << NumBits(n) << " vs expected: " << nbits << endl;
    } while ((nbits != (uint) NumBits(n)) || p == q);

    if (p > q)
        swap(p, q);

	NTL::ZZ lambda = LCM(p-1, q-1);

    if (abits) {
        g = PowerMod(NTL::to_ZZ(2), lambda / a, n);
    } else {
        g = 1;
        do {
            g++;
        } while (GCD(L(PowerMod(g, lambda, n*n), n), n) != NTL::to_ZZ(1));
    }

    return { p, q, g, a };
}

NTL::ZZ
mksum::encrypt(const vector<NTL::ZZ> & pk, const NTL::ZZ & plain)  {
	NTL::ZZ n = pk[0];
	NTL::ZZ g = pk[1];
	uint nbits = NumBits(n);
	NTL::ZZ n2 = n*n;

	NTL::ZZ r = NTL::RandomLen_ZZ(nbits) % n;
	return PowerMod(g, plain + n*r, n2);
}

NTL::ZZ
mksum::add(const vector<NTL::ZZ> & pk, const NTL::ZZ & c1, const NTL::ZZ & c2) {
	NTL::ZZ n = pk[0];
	
	NTL::ZZ n2 = n*n;

	return MulMod(c1, c2, n2);
}

NTL::ZZ
mksum::decrypt(const vector<NTL::ZZ> & k, const NTL::ZZ & cipher)  {
	NTL::ZZ n = k[0]*k[1];
	NTL::ZZ g = k[2];
	NTL::ZZ n2 = n*n;

	NTL::ZZ p = k[0];
	NTL::ZZ q = k[1];
	NTL::ZZ a = k[3];
	bool fast = a != 0;
	NTL::ZZ p2 = p * p;
	NTL::ZZ q2 = q * q;
	NTL::ZZ two_p = power(NTL::to_ZZ(2), NumBits(p));
	NTL::ZZ two_q = power(NTL::to_ZZ(2), NumBits(q));
	NTL::ZZ pinv = InvMod(p, two_p);
	NTL::ZZ qinv = InvMod(q, two_q);
	NTL::ZZ hp = InvMod(Lfast(PowerMod(g % p2, fast ? a : (p-1), p2),
							  pinv, two_p, p), p);
	NTL::ZZ hq = InvMod(Lfast(PowerMod(g % q2, fast ? a : (q-1), q2),
							  qinv, two_q, q), q);

	NTL::ZZ mp = (Lfast(PowerMod(cipher % p2, fast ? a : (p-1), p2),
                   pinv, two_p, p) * hp) % p;
	NTL::ZZ mq = (Lfast(PowerMod(cipher % q2, fast ? a : (q-1), q2),
                   qinv, two_q, q) * hq) % q;

	NTL::ZZ m, pq;
    pq = 1;
    CRT(m, pq, mp, p);
    CRT(m, pq, mq, q);

    return m;
}

// serialization
vector<NTL::ZZ>
mksum::from_bytes(const string & serial) {
	vector<NTL::ZZ> p;

    std::vector<std::string> ps;
    std::stringstream ss(serial);
    std::string item;
    while (std::getline(ss, item, '|')) {
        ps.push_back(item);
    }

	for(uint i = 0; i < ps.size(); i++) {
		p.push_back(mksum::from_bytesN(ps[i]));
	}

    return p;
}

std::string
mksum::to_bytes(const vector<NTL::ZZ> & p) {
	std::string serial = "";

	for(uint i = 0; i < p.size(); i++) {
		serial += mksum::to_bytes(p[i]);
		if(i < p.size() - 1) serial += "|";
	}

    return serial;
}

NTL::ZZ
mksum::from_bytesN(const string & serial) {
	return NTL::ZZ(NTL::INIT_VAL, serial.c_str());
}

std::string
mksum::to_bytes(const NTL::ZZ & p) {
	std::ostringstream ostr;
	ostr << p;
	return ostr.str();
}
