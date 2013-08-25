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
  one_got_access: True/False; True if some principal got access to a principal of this type
 */


AccessInbox = new Meteor.Collection("accessinbox");
/*
  Information about new accesses for each principal that got access.
  princ_id
  to_princ_id
  wrapped_key
*/
