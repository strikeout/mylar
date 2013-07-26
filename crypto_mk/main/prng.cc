#include <assert.h>
#include <string.h>
#include <sys/fcntl.h>
#include <main/prng.hh>
#include <util/errstream.hh>

using namespace std;

urandom::urandom()
    : f("/dev/urandom")
{
    if (f.fail())
        thrower() << "cannot open /dev/urandom: " << strerror(errno);
}

void
urandom::rand_bytes(size_t nbytes, uint8_t *buf)
{
    f.read((char *) buf, nbytes);
}

void
urandom::seed_bytes(size_t nbytes, uint8_t *buf)
{
    f.write((char *) buf, nbytes);
}
