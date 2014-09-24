## v.NEXT


## v0.9.2.2 - new
* added a modifed NProgress (called CProgress, how clever!) to show the user encryption or decryption is happening in the browser
* all Principals now use _id for reference instead of id/_id mix
* Principal.create() now returns existing princ if already in db
* removed error about missing macs when inserting a doc that does not contain the encrypted fields, while throwing a new error when inserting a doc with enc. fields w/o providing principal to encrypt them
* only add to cache when a princ really exists
* fixed PrincInfo method call checking for wrong argument

## v0.9.2.2

* Merged Mylar changes to latest Meteor release
