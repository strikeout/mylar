#/**********************************************************\ 
# Auto-generated X11 project definition file for the
# Crypto Fire Ext project
#\**********************************************************/

# X11 template platform definition CMake file
# Included from ../CMakeLists.txt

# remember that the current source dir is the project root; this file is in X11/
file (GLOB PLATFORM RELATIVE ${CMAKE_CURRENT_SOURCE_DIR}
    X11/[^.]*.cpp
    X11/[^.]*.h
    X11/[^.]*.cmake
    )

SOURCE_GROUP(X11 FILES ${PLATFORM})

# use this to add preprocessor definitions
add_definitions(
)

set (SOURCES
    ${SOURCES}
    ${PLATFORM}
    )

add_x11_plugin(${PROJECT_NAME} SOURCES)

set (CRYPTO_LIBRARY "/home/dvorak42/cryptdb/meteor-enc/enc_modules/crypto_mk")

find_library(gmp gmp)
find_library(pbc pbc)
find_library(ntl ntl)

include_directories(${CRYPTO_LIBRARY})

# add library dependencies here; leave ${PLUGIN_INTERNAL_DEPS} there unless you know what you're doing!
target_link_libraries(${PROJECT_NAME}
    ${PLUGIN_INTERNAL_DEPS}
	pbc
	gmp
	ntl
	"${CRYPTO_LIBRARY}/obj/libcryptmk.so"
    )
