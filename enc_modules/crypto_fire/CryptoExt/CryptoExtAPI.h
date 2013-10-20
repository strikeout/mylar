/**********************************************************\

  Auto-generated CryptoExtAPI.h

\**********************************************************/

#include <string>
#include <sstream>
#include <boost/weak_ptr.hpp>
#include "JSAPIAuto.h"
#include "BrowserHost.h"
#include "CryptoExt.h"
#include "main/b64_wrapper.hh"

#ifndef H_CryptoExtAPI
#define H_CryptoExtAPI

class CryptoExtAPI : public FB::JSAPIAuto
{
public:
    ////////////////////////////////////////////////////////////////////////////
    /// @fn CryptoExtAPI::CryptoExtAPI(const CryptoExtPtr& plugin, const FB::BrowserHostPtr host)
    ///
    /// @brief  Constructor for your JSAPI object.
    ///         You should register your methods, properties, and events
    ///         that should be accessible to Javascript from here.
    ///
    /// @see FB::JSAPIAuto::registerMethod
    /// @see FB::JSAPIAuto::registerProperty
    /// @see FB::JSAPIAuto::registerEvent
    ////////////////////////////////////////////////////////////////////////////
    CryptoExtAPI(const CryptoExtPtr& plugin, const FB::BrowserHostPtr& host) :
        m_plugin(plugin), m_host(host)
    {
        registerMethod("Keygen",      make_method(this, &CryptoExtAPI::Keygen));
        registerMethod("Delta",      make_method(this, &CryptoExtAPI::Delta));
        registerMethod("Token",      make_method(this, &CryptoExtAPI::Token));
        registerMethod("Encrypt",      make_method(this, &CryptoExtAPI::Encrypt));
        registerMethod("IndexEnc",     make_method(this, &CryptoExtAPI::IndexEnc));
        registerMethod("Adjust",      make_method(this, &CryptoExtAPI::Adjust));
        registerMethod("Match",      make_method(this, &CryptoExtAPI::Match));
        
        registerMethod("PKeygen",      make_method(this, &CryptoExtAPI::PKeygen));
        registerMethod("PPubkey",      make_method(this, &CryptoExtAPI::PPubkey));
        registerMethod("PEncrypt",      make_method(this, &CryptoExtAPI::PEncrypt));
        registerMethod("PAdd",      make_method(this, &CryptoExtAPI::PAdd));
        registerMethod("PDecrypt",      make_method(this, &CryptoExtAPI::PDecrypt));
        // Read-only property
        registerProperty("version",
                         make_property(this,
                                       &CryptoExtAPI::get_version));
    }

    ///////////////////////////////////////////////////////////////////////////////
    /// @fn CryptoExtAPI::~CryptoExtAPI()
    ///
    /// @brief  Destructor.  Remember that this object will not be released until
    ///         the browser is done with it; this will almost definitely be after
    ///         the plugin is released.
    ///////////////////////////////////////////////////////////////////////////////
    virtual ~CryptoExtAPI() {};

    CryptoExtPtr getPlugin();

    // Read-only property ${PROPERTY.ident}
    std::string get_version();

	FB::variant Keygen();
	FB::variant Delta(const FB::variant& k1, const FB::variant& k2);
    FB::variant Token(const FB::variant& k1, const FB::variant& word);
	FB::variant Encrypt(const FB::variant& k1, const FB::variant& word);
	FB::variant IndexEnc(const FB::variant& k1, const FB::variant& word);
	FB::variant Adjust(const FB::variant& tok, const FB::variant& delta);
	FB::variant Match(const FB::variant& tok, const FB::variant& cipher);
    
	FB::variant PKeygen();
	FB::variant PPubkey(const FB::variant& k);
	FB::variant PEncrypt(const FB::variant& pk, const FB::variant& word);
	FB::variant PAdd(const FB::variant& pk, const FB::variant& c1, const FB::variant& c2);
	FB::variant PDecrypt(const FB::variant& k, const FB::variant& cipher);

private:
    CryptoExtWeakPtr m_plugin;
    FB::BrowserHostPtr m_host;

	b64mk bmk;
};

#endif // H_CryptoExtAPI

