## v.NEXT

## v0.9.3 - new
* Merged Mylar changes to latest Meteor release v0.9.3
* we can finally update a document if "_id" is in the immutable declaration (it almost always is)
* made some functions check if callback exists before executing and throwing an error if it doesnt
* lookupauthority sometimes got confused by a global var called 'princ', fixed this obscure bug by localizing plus renaming for extra safety
* reintroduced type check
* renamed the subscription.ready() hook to better reflect its purpose
* fixed cert-chain missing the subject_id field
* fixed check for macs failing because a var wasn't assigned
* fixed call to wrong callback when multiple immutables where present
* fixed reference to wrong value in _.each iteration

## v0.9.2.2
* added a modifed NProgress (called CProgress, how clever!) to show the user encryption or decryption is happening in the browser
* all Principals now use _id for reference instead of id/_id mix
* Principal.create() now returns existing princ if already in db
* removed error about missing macs when inserting a doc that does not contain the encrypted fields, while throwing a new error when inserting a doc with enc. fields w/o providing principal to encrypt them
* only add to cache when a princ really exists
* fixed PrincInfo method call checking for wrong argument

## v0.9.2.2
* Merged Mylar changes to latest Meteor release v0.9.2.2
