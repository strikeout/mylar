OBJDIR	 := obj
TOP	 := $(shell echo $${PWD-`pwd`})
CXX	 := g++
PBC	 := /usr/local
# -O2
CXXFLAGS := -g -O0 -fno-strict-aliasing -fno-rtti -fwrapv -fPIC \
	    -Wall -Werror -Wpointer-arith -Wendif-labels -Wformat=2  \
	    -Wextra -Wmissing-noreturn -Wwrite-strings -Wno-unused-parameter \
	    -Wmissing-declarations -Woverloaded-virtual  \
	    -Wunreachable-code -D_GNU_SOURCE -std=c++0x -I$(TOP) -I$(PBC)/include/pbc/
LDFLAGS	 := -lz -lcrypto -lgmp -lntl\
	    -L$(TOP)/$(OBJDIR) -L$(PBC)/lib/ -Wl,-rpath=$(PBC)/lib/  -Wl,-rpath=$(TOP)/$(OBJDIR) -Wl,-rpath=$(TOP)


LDFLAGS	 += -lrt -ldl -lcrypt -lreadline -lgmp -lpbc

## To be populated by Makefrag files
OBJDIRS	:=

.PHONY: all
all:

.PHONY: install
install:

.PHONY: clean
clean:
	rm -rf $(OBJDIR)

# Eliminate default suffix rules
.SUFFIXES:

# Delete target files if there is an error (or make is interrupted)
.DELETE_ON_ERROR:

# make it so that no intermediate .o files are ever deleted
.PRECIOUS: %.o

$(OBJDIR)/%.o: %.cc
	@mkdir -p $(@D)
	$(CXX) -MD $(CXXFLAGS) -c $< -o $@

include util/Makefrag
include main/Makefrag
include test/Makefrag

$(OBJDIR)/.deps: $(foreach dir, $(OBJDIRS), $(wildcard $(OBJDIR)/$(dir)/*.d))
	@mkdir -p $(@D)
	perl mergedep.pl $@ $^
-include $(OBJDIR)/.deps

# .PHONY: indent
# indent:
#	uncrustify --no-backup -c conf/uncrustify.cfg $(wildcard *.cc)

# vim: set noexpandtab:
