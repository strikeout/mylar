
/****
 *
 * Application for testing meteor-enc. It allows us to write various test cases
 * without manual UI manipulation. It is sequential, yet not synchronous.
 *
 ****/



////////// Shared code (client and server) //////////


Forums = new Meteor.Collection("forums"); // {_id, name} 
Posts = new Meteor.Collection("posts"); // {_id, forumID, post}


Posts._encrypted_fields = { 'post' : {princ: 'forumID', princtype: 'forum', attr: 'SEARCHABLE'} };



////// Client ////////////

if (Meteor.isClient) {

    counter = 0; // for synchrony..
    userprinc = undefined;

    Deps.autorun(function () {
    });


    function CreateUser(username, password){

	Accounts.createUser({username:username, password:password},
			    function(error) {
				if (error){
				    console.log("throwing error");
				    throw new Error("Failed to create user "+username);
				} else {
				    idp.create_keys(username, password, function (keys) {
					console.log("keys are " + keys);
					//TODO : not clear when we want to invoke the idp
					Principal.create(new Principal("user", username, deserialize_keys(keys)));
					console.log('done with create user ' + username);
					counter++;
					Template.mytest.runtest();
				    });
				} 
			    });
    }


    function LoginUser(username, password){
	Meteor.loginWithPassword({username: username}, password,
				 function (error){
				     if (error) {
					 throw new Error("Failed to login " +  username + " "+error);
				     } else {
					 idp.get_keys(username, password, function (keys) {
					     var nkeys = deserialize_keys(keys);
					     localStorage['user_princ_keys'] = keys;
					     userprinc = new Principal("user", username, nkeys);
					     counter++;
					     Template.mytest.runtest();
					 });
				     }

				 });
    }

    Template.mytest.runtest = function() {

	var post;
	var fprinc;
	var fname;
	
	console.log("runtest at step "+ counter);

	try {
	    switch (counter) {
	    case 0: {
		$("#status").val("Processing step " + counter);
		CreateUser("alice", "alice");

		break;
	    }
	    case 1: {
		$("#status").val("Processing step " + counter);
		CreateUser("bob", "bob");

		break;
	    }
	    case 2: {
		$("#status").val("Processing step " + counter);
		CreateUser("chris", "chris");

		break;
	    }
	    case 3: {
		$("#status").val("Processing step " + counter);
		LoginUser("alice", "alice");

		break;
	    }
	    case 4: {
		$("#status").val("Processing step " + counter);

		// create a forum
		var fname = "alice's forum";
		fprinc = new Principal("forum", fname);
		console.log("created princ forum, now inserting");
		Forums.insert({'_id': fprinc.id, 'name': fname});

		// create a post in this forum
		console.log("create a post in this forum");
		post = "hello!";
		Posts.insert({forumID: fprinc.id, post: post});

		console.log("before add access");
		Principal.add_access(userprinc, fprinc, function() {

		    console.log("checking Alice's access");
		    // check that Alice gets the data decrypted
		    var post2 = Posts.findOne({forumID: fprinc.id})['post'];
		    if (post != post2) {
			throw new Error("Alice cannot see her post; sees " + post2);
		    } else {
			console.log("Alice saw her post: " + post2);
		    }

		    console.log("fprinc " + fprinc);
		    counter++;
		    Template.mytest.runtest();
		});

		break;
	    }
		
	    case 5: {
		$("#status").val("Processing step " + counter);
		Meteor.logout();
		
		LoginUser("bob", "bob");
		var post3 = Posts.findOne({forumID: fprinc.id})['post'];
		if (post3 != post) {
		    throw new Error("Failed: Bob cannot read his post + post3");
		}
		
		// bob logs out
		Meteor.logout();

		
		// chris logs in and should not be able to see post
		LoginUser("chris", "chris");
		
		break;
	    }
	    case 6: {
		$("#status").val("Processing step " + counter);

		console.log("fprinc is " + fprinc);
		var post4 = Posts.findOne({forumID: fprinc.id})['post'];
		if (post4 == post) {
		    return "Failed: Chris can read his post";
		}
				
		// chris logs out
		Meteor.logout();
				
		break;
	    }
	    case 7: {
		$("#status").val("OK!");
	    }
		
/*	 	    


	    // give access to Bob to this forum
	    idp.lookup("bob",
		       function(keys) {
			   var bobprinc = new Principal("user", "bob", keys);
			   Principal.add_access(bobprinc, fprinc);
		       }
		      );

	    // alice logs out
	    LogoutUser();

	    // bob logs in
	    LoginUser("bob", "bob");
	    var post3 = Posts.findOne({forumID: fprinc.id})['post'];
	    if (post3 != post) {
		return "Failed: Bob cannot read his post + post3";
	    }

	    // bob logs out
	    Meteor.logout();

	    // chris logs in and should not be able to see post
	    LoginUser("chris", "chris");
	    var post4 = Posts.findOne({forumID: fprinc.id})['post'];
	    if (post4 == post) {
		return "Failed: Chris can read his post";
	    }

	    
	    // chris logs out
	    Meteor.logout();*/
	    }
	    
	} catch(err) {
	    Meteor._debug("error: " + err);
	    throw new Error("error:" + err);
	}
	


	
	

}

}


if (Meteor.isServer) {

    ////////// Server only logic //////////
    
    Accounts.onCreateUser(function(options, user) {
	return user;
    });
}