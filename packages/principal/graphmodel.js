Principals = new Meteor.Collection("princs");
/*
  id : unique over all principals (currently, serialized public keys)
  name
  type
  accessInbox: a list of pointers in WrappedKeys where there is a new public key access to be converted in a
               symmetric key access
  */

WrappedKeys = new Meteor.Collection("wrapped_keys");
/* principal: princ.id
   wrapped_for : princ.id -- the id of the princ that gets new access
   wrapped_keys : wrapped secret asymmetric keys
   wrapped_sym_keys : wrapped secret keys, symmetric
   delta
   
   There is a bijection between each edge of the graph and each document.
   Currently computing delta for any edge.
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

GlobalEnc = new Meteor.Collection("globalenc");
/*
  Holds some global variables:
  key : name of variable
  value : value of variable

  e.g. "add_access", true/false -> whether an add access happened in the system
  */

if (Meteor.isServer) {

    var allow_all_writes = {
        insert: function () { return true; },
        update: function () { return true; }
    };
    
    //TODO: needs to be restricted
    Principals.allow(allow_all_writes);
    WrappedKeys.allow(allow_all_writes);
    Certs.allow(allow_all_writes);
    PrincType.allow(allow_all_writes);

    GlobalEnc.allow(allow_all_writes);
    var res = GlobalEnc.findOne({key: "add_access"});
    if (!res) {
	GlobalEnc.insert({key: "add_access", value: false}); // since Meteor does not have save
    } else {
	GlobalEnc.update({_id: res._id}, {$set: {key: "add_access", value: false}});
    }
    Meteor.publish("globalenc", function() {
	return GlobalEnc.find({});
    });
}

if (Meteor.isClient) {
    Deps.autorun(function(){
	Meteor.subscribe("globalenc");
    });

}
