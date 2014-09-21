////////// Server only logic //////////
Meteor.publish("rooms", function(){
    return Rooms.find({$or : [{invitedID : this.userId}, {createdByID: this.userId}] });
});
Meteor.publish("messages", function(roomID){
    return Messages.find({rID: roomID});
});

Meteor.publish("users", function() { 
  return Meteor.users.find({}, {fields: {}});
});


Accounts.onCreateUser(function(options, user) {
  
  user.Room = {"inRoom":false, "inRoomID":"", "inRoomTitle":""};
  user.Online = true;
  // We still want the default hook's 'profile' behavior.
  if (options.profile)
    user.profile = options.profile;
  return user;
});

Meteor.methods({
  UpdateUserRoomInfoToInside: function (roomID, roomTitle) {
    var roomCreator = Rooms.findOne({_id: roomID}).createdByID;
    roomCreator = Meteor.users.findOne({_id: roomCreator}).username;
    Meteor.users.update( { _id:Meteor.userId() },
			 { $set:{ Room: {"inRoom":true , "inRoomID":roomID, "inRoomTitle":roomTitle,
                                         "inRoomCreator": roomCreator} } } );
    Rooms.update({_id:roomID},{$push:{peopleID:Meteor.userId() , peopleUsername:Meteor.user().username}});
  },
  UpdateUserRoomInfoToOutside: function (roomID) {
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Room:{"inRoomID":'', "inRoomTitle":'', "inRoom":false} } });
    Rooms.update({_id:roomID},{$pull:{ peopleID:Meteor.userId(), peopleUsername:Meteor.user().username }});
  },
  DeleteRoom: function (roomID) {
    Rooms.remove({_id:roomID});
      Messages.remove({rID: roomID});  
  },
  UpdateOnlineFalse: function () {
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Online:false } });
  },
  UpdateOnlineTrue: function () {
      Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Online:true } });
  }    
});
