/**********************************************************\

  Auto-generated CryptoExtAPI.cpp

\**********************************************************/

#include "JSObject.h"
#include "variant_list.h"
#include "DOM/Document.h"
#include "global/config.h"
#include "main/b64_wrapper.hh"

#include "CryptoExtAPI.h"

CryptoExtPtr CryptoExtAPI::getPlugin()
{
    CryptoExtPtr plugin(m_plugin.lock());
    if (!plugin) {
        throw FB::script_error("The plugin is invalid");
    }
    return plugin;
}

std::string CryptoExtAPI::get_version()
{
    return FBSTRING_PLUGIN_VERSION;
}

FB::variant CryptoExtAPI::Keygen()
{
	return bmk.keygen();
}

FB::variant CryptoExtAPI::Delta(const FB::variant& k1, const FB::variant& k2)
{
	return bmk.delta(k1.cast<std::string>(), k2.cast<std::string>());
}

FB::variant CryptoExtAPI::Token(const FB::variant& k1, const FB::variant& word)
{
	return bmk.token(k1.cast<std::string>(), word.cast<std::string>());
}

FB::variant CryptoExtAPI::Encrypt(const FB::variant& k1, const FB::variant& word)
{
	return bmk.encrypt(k1.cast<std::string>(), word.cast<std::string>());
}

FB::variant CryptoExtAPI::IndexEnc(const FB::variant& k1, const FB::variant& word)
{
	return bmk.index_enc(k1.cast<std::string>(), word.cast<std::string>());
}

FB::variant CryptoExtAPI::Adjust(const FB::variant& tok, const FB::variant& delta)
{
	return bmk.adjust(tok.cast<std::string>(), delta.cast<std::string>());
}

FB::variant CryptoExtAPI::Match(const FB::variant& tok, const FB::variant& cipher)
{
	return bmk.match(tok.cast<std::string>(), cipher.cast<std::string>());
}

FB::variant CryptoExtAPI::PKeygen()
{
	return bmk.pkeygen();
}

FB::variant CryptoExtAPI::PPubkey(const FB::variant& k)
{
	return bmk.ppubkey(k.cast<std::string>());
}

FB::variant CryptoExtAPI::PEncrypt(const FB::variant& pk, const FB::variant& word)
{
	return bmk.pencrypt(pk.cast<std::string>(), word.cast<std::string>());
}

FB::variant CryptoExtAPI::PAdd(const FB::variant& pk, const FB::variant& c1, const FB::variant& c2)
{
	return bmk.padd(pk.cast<std::string>(), c1.cast<std::string>(), c2.cast<std::string>());
}

FB::variant CryptoExtAPI::PDecrypt(const FB::variant& k, const FB::variant& cipher)
{
	return bmk.pdecrypt(k.cast<std::string>(), cipher.cast<std::string>());
}
