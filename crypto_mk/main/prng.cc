#include <assert.h>
#include <string.h>
#include <main/prng.hh>

using namespace std;

urandom::urandom()
{}

void
urandom::rand_bytes(size_t nbytes, uint8_t *buf)
{
  size_t i;
  for (i = 0; i < nbytes; i++) {
    buf[i] = std::rand() % 256;
  }
}

void
urandom::seed_bytes(size_t nbytes, uint8_t *buf)
{}
