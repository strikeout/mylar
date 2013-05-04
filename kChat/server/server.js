////////// Server only logic //////////
Meteor.publish("rooms", function(){
   return Rooms.find({});
});
Meteor.publish("messages", function(){
   return Messages.find({});
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
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Room: {"inRoom":true , "inRoomID":roomID, "inRoomTitle":roomTitle} } } );
    Rooms.update({_id:roomID},{$push:{peopleID:Meteor.userId() , peopleUsername:Meteor.user().username}});
  },
  UpdateUserRoomInfoToOutside: function (roomID) {
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Room:{"inRoomID":'', "inRoomTitle":'', "inRoom":false} } });
    Rooms.update({_id:roomID},{$pull:{ peopleID:Meteor.userId(), peopleUsername:Meteor.user().username }});
  },
  DeleteRoom: function (roomID) {
    Rooms.remove({_id:roomID});
  },
  UpdateOnlineFalse: function () {
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Online:false } });
  },
  UpdateOnlineTrue: function () {
    Meteor.users.update( { _id:Meteor.userId() }, { $set:{ Online:true } });
  }
});