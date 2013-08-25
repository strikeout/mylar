#pragma once

#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>

typedef struct MKError {
 public:
    MKError(const std::string &m) : msg(m)
    {
    }
    std::string msg;
} FHEError;

class fatal : public std::stringstream {
 public:
    ~fatal() __attribute__((noreturn)) {
        std::cerr << str() << std::endl;
        exit(-1);
    }
};

class thrower : public std::stringstream {
 public:
    ~thrower() __attribute__((noreturn)) {
        throw std::runtime_error(str());
    }
};
