mkdir $HOME/nacl
pushd $HOME/nacl
wget http://storage.googleapis.com/nativeclient-mirror/nacl/nacl_sdk/nacl_sdk.zip
unzip nacl_sdk.zip 
rm nacl_sdk.zip
git clone https://chromium.googlesource.com/external/naclports
wget ftp://ftp.gmplib.org/pub/gmp-5.1.2/gmp-5.1.2.tar.bz2
tar xvf gmp-5.1.2.tar.bz2 
rm gmp-5.1.2.tar.bz2
wget http://crypto.stanford.edu/pbc/files/pbc-0.5.14.tar.gz
tar xvf pbc-0.5.14.tar.gz 
rm pbc-0.5.14.tar.gz
pushd nacl_sdk/
./naclsdk update
popd
export NACL_SDK_ROOT=$HOME/nacl/nacl_sdk/pepper_28
export NACL_PORT=$HOME/nacl/naclports
pushd gmp-5.1.2/
make distclean
NACL_GLIBC=1 $NACL_PORT/build_tools/nacl_env.sh ./configure --enable-static --enable-shared=no --host=nacl CFLAGS="-O3" --prefix=$NACL_SDK_ROOT/toolchain/linux_x86_glibc/x86_64-nacl/
make && make install
make distclean
NACL_ARCH=i686 NACL_GLIBC=1 $NACL_PORT/build_tools/nacl_env.sh ./configure --enable-static --enable-shared=no --host=nacl CFLAGS="-O3" --prefix=$NACL_SDK_ROOT/toolchain/linux_x86_glibc/i686-nacl/ 
make && make install
cp $NACL_SDK_ROOT/toolchain/linux_x86_glibc/i686-nacl/lib/* $NACL_SDK_ROOT/toolchain/linux_x86_glibc/x86_64-nacl/lib32/
make distclean
popd

pushd pbc-0.5.14/
make distclean
NACL_GLIBC=1 $NACL_PORT/build_tools/nacl_env.sh ./configure --enable-static --enable-shared=no --host=nacl CFLAGS="-O3" --prefix=$NACL_SDK_ROOT/toolchain/linux_x86_glibc/x86_64-nacl/
make && make install
make distclean
NACL_ARCH=i686 NACL_GLIBC=1 $NACL_PORT/build_tools/nacl_env.sh ./configure --enable-static --enable-shared=no --host=nacl CFLAGS="-O3" --prefix=$NACL_SDK_ROOT/toolchain/linux_x86_glibc/i686-nacl/ 
make && make install
cp $NACL_SDK_ROOT/toolchain/linux_x86_glibc/i686-nacl/lib/* $NACL_SDK_ROOT/toolchain/linux_x86_glibc/x86_64-nacl/lib32/
make distclean
popd

pushd naclports
NACL_GCC=1 make openssl
./make_all.sh openssl
popd

popd