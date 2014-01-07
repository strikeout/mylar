# Mylar

Mylar is a platform for building web applications that protects data confidentiality against attackers who fully compromise the servers.

Mylar is built on Meteor, a purely Javascript web application framework:
http://docs.meteor.com/

## Demo

Download the EncChat app:
git clone git@g.csail.mit.edu:EncChat

cd EncChat
/path/to/mylar/meteor 

Open a browser and visit localhost:3000. Have fun with the application!

The app is secured against passive adversaries (adversaries who read all data at the server, but do not actively change information).

## Examine

Check that messages are encrypted in the mongo database.
EncChat$ /path/to/mylar/meteor mongo

You should see a field "message_enc" that contains the encryption of the message. There should be no field "message", which before contained the unencrypted data. 

## Cleanup

If you want to reset the application, do:
EncChat$ /path/to/mylar meteor reset

## Enable search

To enable search, you need two things:

1. Install the search plugin
[instructions coming soon]

2. add the search package to the application
EncChat$ /path/to/mylar add search


## Active adversary
[documentation coming soon]


## Develop a new app

Follow the steps:

1. Write a regular Meteor application. Meteor is very easy and fun to learn! https://www.meteor.com/ has great tutorials and documentation.

2. Secure it with Mylar:

First, read the Mylar paper and make sure you understand the section "Building a Mylar application".

2.a. in model.js, annotate which fields are sensitive and should be encrypted
    For example, to encrypt the field "message" of the collection "Messages", do:
    Messages._encrypted_fields({ 'message' : {princ: 'roomprinc', princtype: 'room',
					  attr: 'SEARCHABLE'}});
    Only the principal for the room will have access to the message. 

2.b. Indicate access control annotations. Each user has a principal Principal.user() automatically created. Based on the access control desired, create principals, give principals access to other principals using "add_access", and find principals with "lookup" or "lookupUser". For example, to invite the user "invitee", to a room with principal "room_princ", do:

Principal.lookupUser(invitee, function(princ){
     Principal.add_access(princ, room_princ, function () {
		[..]
     }
}


					  
