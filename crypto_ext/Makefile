VALID_TOOLCHAINS=glibc
NACL_CFLAGS=-Wno-long-long -Werror -g
NACL_CXXFLAGS=-Wno-long-long -Werror -g
include $(NACL_SDK_ROOT)/tools/common.mk
OUTDIR=bin
TARGET=crypto_ext
MACHINE=x86_64
crypto_ext_SOURCES= \
  src/ec.cc \
  src/crypto_ext.cc \
  src/crypto_helper.cc \

DEPS=
LIBS=$(DEPS) ppapi_cpp ppapi pthread crypto pbc gmp ssl

$(foreach dep,$(DEPS),$(eval $(call DEPEND_RULE,$(dep))))
$(foreach src,$(crypto_ext_SOURCES),$(eval $(call COMPILE_RULE,$(src),)))
$(eval $(call LINK_RULE,crypto_ext,$(crypto_ext_SOURCES),$(LIBS),$(DEPS)))
$(eval $(call NMF_RULE,$(TARGET),))
