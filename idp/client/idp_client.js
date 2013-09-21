IS_IDP = true;//TODOs

  
//FUNCTIONS
function CreateUser(){
  var user = $("#username").val().trim();
  var password = $("#password").val().trim();
  if(user.length !== 0 && password.length !=0){
    Accounts.createUser({username:user, password:password},
			function(error){
			    if (error) {
				$("#errorUsernameMsg").text(error);
			    }
			});
  }else{
      $("#errorUsernameMsg").text('Provide nonempty username and password.');
  }
}


function LoginUser(){
  var username = $("#usernameLogin").val().trim();
  var password = $("#passwordLogin").val().trim();
  Meteor.loginWithPassword({username: username}, password,
  function (error){
    if(error){
      $("#loginErroMsg").text('Warning: Incorrect Login');
    } else {
      $('#usernameLogin').val('');
      $('#passwordLogin').val(''); 
      $("#loginErroMsg").text('');
    }
  });
}

    
    
    //EVENTS HANDLERS BUTTON
Template.createArea.events({
    'click #createUserBtn': function(evt) {
	CreateUser();
    },
    'keypress #formCreateUser': function(evt) {
	if (evt.keyCode == 13){
	    CreateUser();
	    return false;
	}
    }
});

    
Template.loginArea.events({
  'click #loginBtn': function(evt) {
    LoginUser();
  },
  'keypress #formLoginUser': function(evt) {
    if (evt.keyCode == 13){
      LoginUser();
      return false;
    }
  }
});


Template.home.user = function() {
  return Meteor.user();
};

Template.home.events({
    'click #logoutBtn': function(evt) {
	Meteor.logout();
    },
});
   	     


// calls cb with an application specific key
get_app_key = function(arg, origin, cb) {
    Meteor.call('get_app_key', origin, function(err, res) {
	if (err) {
	    throw new Error("cannot get app key from server");
	}
	cb && cb(res);
    });
}

// calls cb with a certificate
create_cert = function(msg, origin, cb) {
    console.log("idp_client " + msg + origin);
    Meteor.call("create_cert", msg, origin, function(err, cert) {
	if (err) {
	    throw new Error("cannot get cert from server");
	}
	console.log("server replied with cert " + cert);
	cb && cb(cert);
    });
}

get_uname = function(arg, origin, cb) {
    if (!Meteor.user()) {
	//no one logged in the idp
	cb(null);
    } else {
	cb(Meteor.user().username);
    }
}