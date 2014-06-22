# to install the extension, run "zip -r ../cf.xpi *" in this folder,
then select Tools->addons from the menu in Firefox. In the addon window,
click the "tool" icon and select "install from file". Select cf.xpi as
file, then restart firefox.

Alternatively, write the path of this directory into the appropriate
file in the Firefox extensions directory:

  pwd > ~/.mozilla/firefox/<profiledir>/extensions/mylar@pdos.csail.mit.edu



changes for v2:

* all pages must be signed
* hash must be the only thing in query string and match exactly, if present(GET parameter)
* content type included in signature to prevent server from changing content types
* in secure origin, only allow those pages to load as top-level that the developer intends
* force content types of config.json and sockjs/info
* add special flag to Http channel to bypass local cache when loading content in secure origin

changes for v3:

* signature is extracted from SN location attribute in X509 SSL cert
* all content must be accompanied by a signature, may be wildcard
* dropped top-level page distinction


Algorithm pseudocode:

if X509 cert has L=cf-dev-key:
    hash content, content type (header) and filename

    if path and ctype do not match test-exempt paths:

        if query string contains hash of page:
            if hash( content, ctype, filename) does not match query string hash:
                BLOCK CONTENT FROM LOADING 
        
        if hash( contnet, ctype, filename) does not match signature:
            BLOCK CONTENT FROM LOADING

else:
    assume CA does good job, this wesbite doesn't need checking

LOAD PAGE


changes for v3:

* removed paths that were exempt from checking
* only application entry point is now served with key from secure origin,
    other files are included (with hash in query string) from a separate origin
* must serve all content over https, otherwise firefox will complain (blocks mixed content)

hint for setup: 
run: ROOT_URL=https://yourdomain.com:4343 meteor run -p 3000 -e 5000
configure nginx to forward https 443 to main app server(port 5000), https 4343 to normal meteor server (port 3000)
