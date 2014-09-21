var debug = false;

msg_handle = undefined;

function roomprinc(cb) {
    var u = Meteor.user();
    if (u && u.Room && u.Room.inRoom) {
        room = u.Room;
        Principal.lookup([new PrincAttr("room", room.inRoomTitle)], room.inRoomCreator,
            function (room_princ) {
                cb(room_princ);
            });
    } else {
        throw new Error("no user,room or in room ");
    }
}


window.jsErrors = [];
window.onerror = function () {
    window.jsErrors[window.jsErrors.length] = arguments;
}

//HOME TEMPLATE
Template.home.rooms = function () {
    return  Rooms.find();
};

Template.home.user = function () {
    return Meteor.user();
};

Template.home.usersOnline = function () {
    return Meteor.users.find({Online: true});
};


//ROOM TEMPLATE
Template.room.user = function () {
    return Meteor.user();
};

Template.room.peopleInRoom = function () {
    return Rooms.findOne({_id: Meteor.user().Room.inRoomID});
};

Template.room.messageCount = function () {
    return Messages.find({rID: Meteor.user().Room.inRoomID});
};

//LOBBY TEMPLATE
Template.lobby.rooms = function () {
    return Rooms.find({ roomTitle: { $ne: ''} });
};

/******** SEARCH TEMPLATES **********/

search_happened = false;

Template.searcharea.searchHappened = function () {
    return search_happened;
}

function searchResCount() {
    var search_tag = Session.get("search_tag");
    if (!search_tag) {
        return 0;
    }
    var res = Messages.find({_tag: search_tag}).count();
    return res;
}

Template.searcharea.resCount = function () {
    return searchResCount();
}

Template.searcharea.hasResults = function () {
    return searchResCount() > 0;
}

Template.searcharea.rooms = function () {
    var search_tag = Session.get("search_tag");
    if (!search_tag) {
        return Messages.find({_tag: "nothing"});
    }
    return Messages.find({_tag: search_tag});
};

/****************************************/


Template.lobby.usersOnline = function () {
    return Meteor.users.find({Online: true});
};

//EVENTS HANDLERS BUTTON
Template.home.events({
    'click #chatnowBtn': function (evt) {
        CreateUser();
    },
    'click #logoutBtn': function (evt) {
        //UPDATE USER COLLECTION ONLINE FALSE
        Meteor.call('UpdateOnlineFalse');
        Meteor.logout();
        Session.set('search_tag', undefined);
        search_happened = false;
    },
});


function joinRoom(evt) {
    var roomID = $(evt.target).attr("roomId");
    msg_handle = Meteor.subscribe("messages", roomID, function () {
        var roomTitle = $(evt.target).attr("roomTitle");
        //TODO: display creator to users
        var roomCreatorID = Rooms.findOne({_id: roomID, roomTitle: roomTitle})["createdByID"];
        var creator = Meteor.users.findOne({_id: roomCreatorID})["username"];

        if (debug) console.log("join room " + roomTitle + " with creator " + creator);

        //UPDATE USER WHEN JOINED ROOM
        Meteor.call('UpdateUserRoomInfoToInside', roomID, roomTitle);
    });
}

Template.loginModal.events({
    'click #chatnowLoginBtn': function (evt) {
        console.log("chat now");
        LoginUser();
    },
});

Template.lobby.events({
    'click #createRoomBtn': function (evt) {
        CreateRoom();
        return false;
    },
    'keypress #roomTitleName': function (evt) {
        if (evt.keyCode == 13) {
            CreateRoom();
            return false;
        }
    },
    'click .joinRoom': function (evt) {
        joinRoom(evt);
    },
    'click .deleteRoom': function (evt) {

        var roomID = $(evt.target).attr("roomId");
        $("#deleteAlert-" + roomID).show('slow');
    },
    'click .cancelDelete': function (evt) {
        var roomID = $(evt.target).attr("roomId");
        $("#deleteAlert-" + roomID).hide('slow');
        //UPDATE USER WHEN JOINED ROOM
        //Meteor.call('UpdateUserRoomInfoToInside', roomID, roomTitle);
    },
    'click .deleteConfirm': function (evt) {
        var roomID = $(evt.target).attr("roomId");
        //DELETE ROOM
        Meteor.call('DeleteRoom', roomID);
    }
});

Template.room.events({
    'click #invite': function (evt) {
        var roomID = Meteor.user().Room.inRoomID;
        var invitee = $("#invite_user").val();
        var inviteeID = Meteor.users.findOne({username: invitee}, {_id: 1})['_id'];

        Rooms.update({_id: roomID}, {$push: {invitedID: inviteeID }});

        roomprinc(function (room_princ) {
            Principal.lookupUser(invitee, function (princ) {
                Principal.add_access(princ, room_princ, function () {
                    $("#invite_user").val("");
                });
            });
        });
    }
});

Template.room.events({
    'click #sendMessage': function (evt) {
        var msg = $("#messageTextArea").val();

        var title = $("#roomtitle").text();
        var creator = $("#roomcreator").text();
        roomprinc(function (room_princ) {
            Messages.insert({
                rID: Meteor.user().Room.inRoomID,
                roomprinc: room_princ.id,
                roomTitle: title,
                message: msg,
                userID: Meteor.userId(),
                username: Meteor.user().username,
                time: getFormattedDate()
            });
            $("#messageTextArea").val('');
        });
    },
    'keypress #messageTextArea': function (evt) {
        if (evt.keyCode == 13) {
            if (evt.shiftKey === true) {
                // new line
                return true;
            }
            else {

                var msg = $("#messageTextArea").val();

                var title = $("#roomtitle").text();
                var creator = $("#roomcreator").text();//why do we need room creator here?
                roomprinc(function (room_princ) {
                    Messages.insert({
                        rID: Meteor.user().Room.inRoomID,
                        roomprinc: room_princ.id,
                        roomTitle: title,
                        message: msg,
                        userID: Meteor.userId(),
                        username: Meteor.user().username,
                        time: getFormattedDate()
                    });
                    $("#messageTextArea").val('');
                });
            }
            return false;
        }
    },
    'click #exitRoom': function (evt) {
        var roomID = $(evt.target).attr("roomId");
        if (msg_handle) {
            msg_handle.stop();
        }
        Meteor.call('UpdateUserRoomInfoToOutside', roomID);
    }

});


//FUNCTIONS
function CreateUser() {
    var user = $("#username").val().trim();
    var password = $("#password").val().trim();
    console.log("u p " + user + " " + password);
    if (user.length >= 0 && password.length != 0) {
        Accounts.createUser({username: user, email: user, password: password}, function (error) {
            if (error) {
                $("#errorUsernameMsg").text(error);
            }
        });
    } else {
        $("#errorUsernameMsg").text('Username and Password must be non empty.');
    }
}

function LoginUser() {
    var username = $("#usernameLogin").val().trim();
    var password = $("#passwordLogin").val().trim();

    Meteor.loginWithPassword({email: username}, password,
        function (error) {
            if (error) {
                //alert("Failed to login");
                $("#loginErroMsg").text('Warning: Incorrect Login: ' + error);
            } else {
                //UPDATE USER COLLECTION ONLINE TRUE
                Meteor.call('UpdateOnlineTrue');

                $('#usernameLogin').val('');
                $('#passwordLogin').val('');
                $("#loginErroMsg").text('');
                $('#loginModal').hide();
            }
        });
}

function CreateRoom() {
    var roomtitle = $("#roomTitleName").val().trim();

    if (roomtitle.length !== 0 && roomtitle.length >= 4 && roomtitle.length <= 16) {
        Principal.create("room", roomtitle, Principal.user(), function (rp) {
            Rooms.insert({roomTitle: roomtitle, peopleID: [], peopleUsername: [], invitedID: [],
                createdByID: Meteor.userId(), roomprinc: rp.id });

            $("#createRoomErroMsg").text('');

            $("#roomTitleName").val('');
        });

    } else {
        $("#createRoomErroMsg").text('Please Fill in Field (Must contain at LEAST 4 and at MOST 16 Characters');
    }


}

function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" +
        date.getDate() + " " + date.getHours() + ":" +
        date.getMinutes() + ":" + date.getSeconds();

    return str;
}


Template.searcharea.events({
    'click #search': function (evt) {

        if (!search_loaded()) {
            if (typeof Android == "undefined") {
                alert("You don't have search turned on. Follow instructions in README to turn it on.");
            } else {
                Android.showPretty("You don't have search turn on. Instructions for search in Android coming soon!");
            }
            return;
        }
        var word = $("#search_word").val();
        search_happened = true;
        var userprinc = Principal.user();

        Messages.search("search-messages-of-userid",
            {'message': word}, userprinc, Meteor.userId(),
            postSearchResults);

    },
    'click .joinRoom': function (evt) {
        joinRoom(evt);
    }

});

postSearchResults = function (search_res) {

    console.log("post search results");

    $("#search_word").val("");
}

Deps.autorun(function () {
    Meteor.subscribe("rooms");
    Meteor.subscribe("users");
});


Template.lobby.rendered = function () {
    var room = Rooms.find({});
    room.forEach(function (room) {
        $('.tooltip-' + room._id).tooltip({trigger: 'click'});

        //DELETE BUTTON SHOW
        if (room.createdByID === Meteor.userId()) {
            $('#delete-' + room._id).show();
        } else {
            $('#delete-' + room._id).hide();
        }
    });
}

Template.room.rendered = function () {
    //Scroll the msglog All the way to the end
    var elem = document.getElementById('msgLog');
    elem.scrollTop = elem.scrollHeight;

}
