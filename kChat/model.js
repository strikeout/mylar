////////// Shared code (client and server) //////////
Rooms = new Meteor.Collection('rooms');
Messages = new Meteor.Collection('messages');

if (Meteor.isServer) {
	// Rooms.allow({
	//   insert: function (userId, doc) {
	//     // the user must be logged in, and the document must be owned by the user
	//     return (userId && doc.owner === userId);
	//   },
	//   update: function (userId, doc, fields, modifier) {
	//     // can only change your own documents
	//     return doc.owner === userId;
	//   },
	//   remove: function (userId, doc) {
	//     // can only remove your own documents
	//     return doc.owner === userId;
	//   },
	//   fetch: ['owner']
	// });

	// Rooms.remove({});
	// Messages.remove({});
	// Meteor.users.remove({});


}
if (Meteor.isClient) {

  
}

