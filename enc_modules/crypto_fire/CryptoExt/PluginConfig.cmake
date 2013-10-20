#/**********************************************************\ 
#
# Auto-Generated Plugin Configuration file
# for Crypto Fire Ext
#
#\**********************************************************/

set(PLUGIN_NAME "CryptoExt")
set(PLUGIN_PREFIX "CEX")
set(COMPANY_NAME "PDOS")

# ActiveX constants:
set(FBTYPELIB_NAME CryptoExtLib)
set(FBTYPELIB_DESC "CryptoExt 1.0 Type Library")
set(IFBControl_DESC "CryptoExt Control Interface")
set(FBControl_DESC "CryptoExt Control Class")
set(IFBComJavascriptObject_DESC "CryptoExt IComJavascriptObject Interface")
set(FBComJavascriptObject_DESC "CryptoExt ComJavascriptObject Class")
set(IFBComEventSource_DESC "CryptoExt IFBComEventSource Interface")
set(AXVERSION_NUM "1")

# NOTE: THESE GUIDS *MUST* BE UNIQUE TO YOUR PLUGIN/ACTIVEX CONTROL!  YES, ALL OF THEM!
set(FBTYPELIB_GUID 1a5662cf-9432-5c49-a513-08b29b0007e7)
set(IFBControl_GUID b3389c72-23a0-5ab5-ae2d-9e71e2f12cc1)
set(FBControl_GUID 567805a7-aa6d-5bce-b5a7-dde6bef468ba)
set(IFBComJavascriptObject_GUID 446b3906-e35d-5e9a-8012-89e9fc5d59aa)
set(FBComJavascriptObject_GUID 4e557df1-22da-5c5b-9a14-f1d356e0e978)
set(IFBComEventSource_GUID 881c1cbb-d5ee-50f4-b133-108ca1173f5e)
if ( FB_PLATFORM_ARCH_32 )
    set(FBControl_WixUpgradeCode_GUID 631363de-b8af-533f-804b-90ca5e5fb45e)
else ( FB_PLATFORM_ARCH_32 )
    set(FBControl_WixUpgradeCode_GUID 95b0898e-a878-525e-b64d-d1020b99b113)
endif ( FB_PLATFORM_ARCH_32 )

# these are the pieces that are relevant to using it from Javascript
set(ACTIVEX_PROGID "PDOS.CryptoExt")
set(MOZILLA_PLUGINID "pdos.csail.mit.edu/CryptoExt")

# strings
set(FBSTRING_CompanyName "CSAIL PDOS")
set(FBSTRING_PluginDescription "Plugin to provide crypto methods to javascript apps.")
set(FBSTRING_PLUGIN_VERSION "1.0.0.0")
set(FBSTRING_LegalCopyright "Copyright 2013 CSAIL PDOS")
set(FBSTRING_PluginFileName "np${PLUGIN_NAME}.dll")
set(FBSTRING_ProductName "Crypto Fire Ext")
set(FBSTRING_FileExtents "")
if ( FB_PLATFORM_ARCH_32 )
    set(FBSTRING_PluginName "Crypto Fire Ext")  # No 32bit postfix to maintain backward compatability.
else ( FB_PLATFORM_ARCH_32 )
    set(FBSTRING_PluginName "Crypto Fire Ext_${FB_PLATFORM_ARCH_NAME}")
endif ( FB_PLATFORM_ARCH_32 )
set(FBSTRING_MIMEType "application/x-cryptoext")

# Uncomment this next line if you're not planning on your plugin doing
# any drawing:

set (FB_GUI_DISABLED 1)

# Mac plugin settings. If your plugin does not draw, set these all to 0
set(FBMAC_USE_QUICKDRAW 0)
set(FBMAC_USE_CARBON 0)
set(FBMAC_USE_COCOA 0)
set(FBMAC_USE_COREGRAPHICS 0)
set(FBMAC_USE_COREANIMATION 0)
set(FBMAC_USE_INVALIDATINGCOREANIMATION 0)

# If you want to register per-machine on Windows, uncomment this line
#set (FB_ATLREG_MACHINEWIDE 1)
