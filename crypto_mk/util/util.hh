#pragma once

#include <util/errstream.hh>
#include <sys/time.h>

void assert_s (bool value, const std::string &msg)
    throw (MKError);
 


class Timer {
 private:
    Timer(const Timer &t);  /* no reason to copy timer objects */

 public:
    Timer() { lap(); }

    //microseconds
    uint64_t lap() {
        uint64_t t0 = start;
        uint64_t t1 = cur_usec();
        start = t1;
        return t1 - t0;
    }

    //milliseconds
    double lap_ms() {
        return ((double)lap()) / 1000.0;
    }

 private:
    static uint64_t cur_usec() {
        struct timeval tv;
        gettimeofday(&tv, 0);
        return ((uint64_t)tv.tv_sec) * 1000000 + tv.tv_usec;
    }

    uint64_t start;
};
