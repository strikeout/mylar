////////// Shared code (client and server) //////////

Rooms = new Meteor.Collection('rooms');
/*  roomTitle
    peopleID
    peopleUsername: creator username
    invitedID : list of ids of users invited to this room
    createdByID: user id creator 
*/
Messages = new Meteor.Collection('messages');
 /* rID: room id,
    roomprinc
    message,
    userID: id of user sender,
    username: username of sender,
    time: time when message was sent
*/

// returns true if search package loaded
search_loaded = function() {
    return (typeof MYLAR_USE_SEARCH != "undefined");
}

if (search_loaded()) {
    Messages._encrypted_fields({ 'message' : {princ: 'roomprinc', princtype: 'room',
					  attr: 'SEARCHABLE', auth: ['_id']}});
} else {
    Messages._encrypted_fields({ 'message' : {princ: 'roomprinc', princtype: 'room',
					      auth: ['_id']}});
}

Messages._immutable({roomprinc: ['rID', 'roomTitle', '_id']});


/* trusted IDP: */
var idp_pub = '8a7fe03431b5fc2db3923a2ab6d1a5ddf35cd64aea35e743' +
              'ded7655f0dc7e085858eeec06e1c7da58c509d57da56dbe6';
idp_init("http://localhost:3000", idp_pub, false);

// use IDP only if active attacker
Accounts.config({sendVerificationEmail:active_attacker()});


if (Meteor.isServer) {
    Rooms.allow({
	// anyone can insert a new room
	insert: function (userId, doc) {
	    return true;
	},
	// only owner can change room
	update: function (userId, doc, fields, modifier) {
	    return doc.createdByID === userId;
	},
	// only owner can remove room
	remove: function (userId, doc) {
	    return doc.createdByID === userId;
	}
    });

    Messages.allow({
	// can only insert a message in a room if you have access to the room 
	insert : function(userId, doc) {
	    var room = Rooms.findOne({_id : doc.rID});
	    return room.createdByID == userId || _.contains(room.invitedID, userId); 
	},

	// no one can update messages here
	update : function(userId, doc, fields, modifier) {
	    return false;
	},

	// no one can delete messages
	remove: function(userId, doc) {
	    return false;
	}
    });

    filter = function(userID) {
	// create a list of all the rooms this user has access to
	var rooms = Rooms.find({$or: [{createdByID: userID},
				      {invitedID : userID}]
			       }).fetch();
	var filters = [];
	_.each(rooms, function(room) {
	    filters.push({rID: room._id});
	});
	
	return filters;
    };

    if (search_loaded()) {
	Messages.publish_search_filter("search-messages-of-userid", filter);
    }


}


