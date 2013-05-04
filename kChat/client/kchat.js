//HOME TEMPLATE
Template.home.rooms = function() {
  return Rooms.find({ roomTitle: {$ne: ''} });
};

Template.home.user = function() {
  return Meteor.user();
};

Template.home.usersOnline = function() {
  return Meteor.users.find({Online:true});
};


//ROOM TEMPLATE
Template.room.user = function() {
  return Meteor.user();
};

Template.room.peopleInRoom = function() {
  return Rooms.findOne({_id:Meteor.user().Room.inRoomID});
};

Template.room.messageCount = function() {
  return Messages.find({rID:Meteor.user().Room.inRoomID});
};


//LOBBY TEMPLATE
Template.lobby.rooms = function() {
  return Rooms.find({ roomTitle: { $ne: ''} });
};
Template.lobby.usersOnline = function() {
  return Meteor.users.find({Online:true});
};

//EVENTS HANDLERS BUTTON
Template.home.events({
  'click #chatnowBtn': function(evt) {
    CreateUser();
  },
  'click #logoutBtn': function(evt) {
    //UPDATE USER COLLECTION ONLINE FALSE
    Meteor.call('UpdateOnlineFalse');
    Meteor.logout();
  },
  'keypress #formCreateUser': function(evt) {
    if (evt.keyCode == 13){
      CreateUser();
      return false;
    }
  }
});

Template.loginModal.events({
  'click #chatnowLoginBtn': function(evt) {
    LoginUser();
  },
  'keypress #formLoginUser': function(evt) {
    if (evt.keyCode == 13){
      LoginUser();
      return false;
    }
  }
});

Template.lobby.events({
  'click #createRoomBtn': function(evt) {
    CreateRoom();
  },
  'keypress #roomTitleName': function(evt) {
    if (evt.keyCode == 13){
      CreateRoom();
      return false;
    }
   },
  'click .joinRoom': function(evt) {
    var roomID= $(evt.target).attr("roomId");
    var roomTitle= $(evt.target).attr("roomTitle");

    //UPDATE USER WHEN JOINED ROOM
    Meteor.call('UpdateUserRoomInfoToInside', roomID, roomTitle);
  },
  'click .deleteRoom': function(evt) {

    var roomID= $(evt.target).attr("roomId");
    $("#deleteAlert-"+roomID).show('slow');
  },
  'click .cancelDelete': function(evt) {
    var roomID= $(evt.target).attr("roomId");
    $("#deleteAlert-"+roomID).hide('slow');
    //UPDATE USER WHEN JOINED ROOM
    //Meteor.call('UpdateUserRoomInfoToInside', roomID, roomTitle);
  },
  'click .deleteConfirm': function(evt) {
    var roomID= $(evt.target).attr("roomId");
    //DELETE ROOM
    Meteor.call('DeleteRoom', roomID);
  }
});


Template.room.events({
  'click #sendMessage': function(evt) {
    var msg= $("#messageTextArea").val();

    Messages.insert({
      rID: Meteor.user().Room.inRoomID,
      message:msg,
      userID:Meteor.userId(),
      username:Meteor.user().username,
      time:getFormattedDate()
    });

    $("#messageTextArea").val('');
  },
  'keypress #messageTextArea': function(evt) {
    if (evt.keyCode == 13){
      if (evt.shiftKey === true){
          // new line
          return true;
      }
      else{
        var msg= $("#messageTextArea").val();

        Messages.insert({
          rID: Meteor.user().Room.inRoomID,
          message:msg,
          userID:Meteor.userId(),
          username:Meteor.user().username,
          time:getFormattedDate()
        });

        $("#messageTextArea").val('');
      }
      return false;
    }
  },  
  'click #exitRoom': function(evt) {
    var roomID= $(evt.target).attr("roomId");
    Meteor.call('UpdateUserRoomInfoToOutside', roomID);
  }

});

//FUNCTIONS
function CreateUser(){
  console.log("called");
  var user = $("#username").val().trim();
  var password1 = $("#password1").val().trim();
  var password2 = $("#password2").val().trim();
  if(user.length >= 5 && user.length !== 0 && password1 === password2 && password1.length !=0){
    Accounts.createUser({username:user, password:password1}, function(error){
      if(error){
        $("#errorUsernameMsg").text('User Already Exist');
      }
    });
  }else{
    $("#errorUsernameMsg").text('Username Must Contain At least 5 Characters');
        //alert('Must Contain At least 5 Characters');
  }
}

function LoginUser(){
  var username = $("#usernameLogin").val().trim();
  var password = $("#passwordLogin").val().trim();
  Meteor.loginWithPassword(username, password,
  function (error){
    if(error){
      //alert("Failed to login");
      $("#loginErroMsg").text('Warning: Incorrect Login');
    }else{

      //UPDATE USER COLLECTION ONLINE TRUE
      Meteor.call('UpdateOnlineTrue');

      $('#loginModal').modal('hide');
      $('#usernameLogin').val('');
      $('#passwordLogin').val(''); 
      $("#loginErroMsg").text('');
    }

  });
}

function CreateRoom(){
  var roomtitle = $("#roomTitleName").val().trim();
  if(roomtitle.length !== 0 && roomtitle.length >= 4 && roomtitle.length <= 16 ){
    Rooms.insert({ roomTitle:roomtitle, peopleID:[], peopleUsername:[], createdByID:Meteor.userId() });
    $("#roomTitleName").val('');
    $("#createRoomErroMsg").text('');
  }else{
    $("#createRoomErroMsg").text('Please Fill in Field (Must contain at LEAST 4 and at MOST 16 Characters');
  }
}

function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

    return str;
}

Meteor.startup(function() {

});

Meteor.autorun(function(){
  Meteor.subscribe("rooms");
  Meteor.subscribe("users");
  Meteor.subscribe("messages");

  
});

Template.lobby.rendered = function(){
    var room = Rooms.find({});
    room.forEach(function (room) {
      $('.tooltip-'+room._id).tooltip({trigger:'click'});

      //DELETE BUTTON SHOW
      if(room.createdByID === Meteor.userId()){
        $('#delete-'+room._id).show();
      }else{
        $('#delete-'+room._id).hide();
      }
    });
}

Template.room.rendered = function(){
  //Scroll the msglog All the way to the end
  var elem = document.getElementById('msgLog');
  elem.scrollTop = elem.scrollHeight;


}
