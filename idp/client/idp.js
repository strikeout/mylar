IS_IDP = true;//TODOs

    
Deps.autorun(function () {
    Meteor.subscribe("userdata");
});

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
      $("#errorUsernameMsg").text('Username Must Contain At least 5 Characters');
      //alert('Must Contain At least 5 Characters');
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
   	     
}

// calls cb with an application specific key
get_app_key = function(arg, origin, cb) {
    Meteor.call('getappkey', origin, function(err, res) {
	if (err) {
	    throw new Error("cannot get app key from server");
	}
	cb && cb(res);
    });
}

// calls cb with a certificate
certify_pk = function(pk, origin, cb) {
    Meteor.call("certifypk", pk, origin, function(err, cert) {
	if (err) {
	    throw new Error("cannot get cert from server");
	}
	cb && cb(cert);
    });
}

