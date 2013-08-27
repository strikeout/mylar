Principals = new Meteor.Collection("princs");
/*
  id : unique over all principals (currently, serialized public keys)
  name
  type 
  */

WrappedKeys = new Meteor.Collection("wrapped_keys");
/* principal: princ.id
   wrapped_for : princ.id -- the id of the princ that gets new access
   wrapped_keys : wrapped secret asymmetric keys
   delta
   wrapped_sym_keys : wrapped secret keys, symmetric
*/
   
Certs = new Meteor.Collection("certs");
/*
  subject_id : princ id
  subject_type
  subject_name
  subject_pk
  signer : id of principal signer
  signature
 */

PrincType = new Meteor.Collection("princtype");
/*
  Information on principal type:
  type
  searchable : True/False
 */


AccessInbox = new Meteor.Collection("accessinbox");
/*
  Information about new accesses for each user who got that access.
  user_id
  entry_id : id of entry in WrappedKeys
*/

GlobalEnc = new Meteor.Collection("globalenc");
GlobalEnc.insert({key: "add_access", value: false});
/*
  Holds some global variables:
  key
  value

  e.g. "add_access", true/false -> whether an add access happened in the system
  */