#pragma once

#include <pbc/pbc.h>

class ec_serializable {
public:
    std::string stringify(int truncate = 0);
    int to_bytes(void** output);
    static void from_bytes(void* ser, ec_serializable &output);
    element_ptr e;
};

class ec_scalar : public ec_serializable {
public:
    ec_scalar(const element_ptr & _e);
    ec_scalar();
    ~ec_scalar();

    ec_scalar operator/(const ec_scalar & s) const;
    void operator=(const ec_scalar & s);
};

class ec_point : public ec_serializable {
public:
    ec_point();
    ec_point(const element_ptr & _e);
    ~ec_point();

    ec_point operator^(const ec_scalar & s) const;
    void operator=(const ec_point & s);

    std::string pretty();
};


class EC {
public:
    EC();
    ~EC();

    void elem_init_G2(element_ptr e);
    void elem_init_Zr(element_ptr e);

    ec_point sample_G2();
    ec_scalar sample_scalar();
    
    ec_point hash(const std::string & s);

    ec_point pair(const ec_point & p1, const ec_point & p2);

    std::string xor_pattern (const ec_point & n);
    bool has_pattern(const std::string & tok, const std::string & ciph);

    static const int CTSIZE = 24;

private:
    pairing_ptr pairing;

    static const int SEEDSIZE = 16;
};
