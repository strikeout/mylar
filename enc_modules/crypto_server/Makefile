CXX	 := g++

TOP	 := $(shell echo $${PWD-`pwd`})
MK 	:= $(TOP)/../crypto_mk
PBC	:= /usr/local

# -O2
CXXFLAGS := -g -O0 -fno-strict-aliasing -fno-rtti -fwrapv -fPIC \
	    -Wall -Werror -Wpointer-arith -Wendif-labels -Wformat=2  \
	    -Wextra -Wmissing-noreturn -Wwrite-strings -Wno-unused-parameter \
	    -Wmissing-declarations -Woverloaded-virtual  \
	    -Wunreachable-code -D_GNU_SOURCE -std=c++0x -I$(TOP) -I$(PBC)/include/pbc/ -I$(MK)/main -I$(MK)

LDFLAGS	 := -lz \
	    -L$(TOP)/$(OBJDIR) -L$(PBC)/lib/ -Wl,-rpath=$(PBC)/lib/  -Wl,-rpath=$(TOP) -Wl,-rpath=$(MK)/obj -L$(MK)/obj  -lcryptmk


SRC := CryptoServer.cc server.cc


all: crypto_server

crypto_server: $(SRC)
	$(CXX) $(CXXFLAGS) -o $@ $(SRC) $(LDFLAGS)

clean:
	rm -rf *.o crypto_server
