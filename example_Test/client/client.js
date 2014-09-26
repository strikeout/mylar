CreateUser = function (s, cb) {
    s = s || ''
    var user = 'a@a.com' + s;
    Accounts.createUser({username: user, email: user, password: user}, function (error) {
        if (error) {
            console.log(error)
        }
        console.log('Logged in:', user)
    });
}

LoginUser = function (s) {
    s = s || '';
    var username = 'a@a.com' + s;
    var password = username;

    Meteor.loginWithPassword({email: username}, password, function (error) {
        if (error) {
            console.log(error)
        } else {
            console.log(username, 'ONLINE!')
        }
    });
}

Template.list.vault_stammdaten = function () {
    return Vault_stammdaten.find()
}
Template.list.vault_scoring = function () {
    return Vault_scoring.find()
}
Template.list.vault_social = function () {
    return Vault_social.find()
}


Template.but1.events({
    'click button.insert_vault': function (evnt) {
        Principal.create('vault_stammdaten', Meteor.userId(), Principal.user(), function (princ) {
            if (!princ) throw new Error('princ_404');
            var res = Vault_stammdaten.insert({owner: Meteor.userId(), name: 'Horst', sex: 'yes', p: princ._id});
            console.log(res);
        });
        Principal.create('vault_social', Meteor.userId(), Principal.user(), function (princ) {
            if (!princ) throw new Error('princ_404');
            var res = Vault_social.insert({owner: Meteor.userId(), fb: 1234, xing: 11, p: princ._id});
            console.log(res);
        });
        Principal.create('vault_scoring', Meteor.userId(), Principal.user(), function (princ) {
            if (!princ) throw new Error('princ_404');
            var res = Vault_scoring.insert({owner: Meteor.userId(), schufa: 95, demda: 'gelb', p: princ._id});
            console.log(res);
        });

    },
    'click button.update_vault': function (evnt) {
        var _id = Vault_social.findOne()._id;
        Vault_social.update(_id, {$set: {fb: 999, owner: Meteor.userId(), p: PRINC_VAULT_SOCIAL._id}});
    },


    'click button.find_vault_princs': function (evnt) {

        Principal.lookup([new PrincAttr("vault_stammdaten", Meteor.userId())], Principal.user(), function (princ_vault) {
            PRINC_VAULT_STAMMDATEN = princ_vault;
            console.log('vault_stammdaten', princ_vault);
        });
        Principal.lookup([new PrincAttr("vault_social", Meteor.userId())], Principal.user(), function (princ_vault) {
            PRINC_VAULT_SOCIAL = princ_vault;
            console.log('vault_social', princ_vault);
        });
        Principal.lookup([new PrincAttr("vault_scoring", Meteor.userId())], Principal.user(), function (princ_vault) {
            PRINC_VAULT_SCORING = princ_vault;
            console.log('vault_scoring', princ_vault);
        });

    },
    'click button.find_user_princs': function (evnt) {

        Principal.lookupUser('a@a.com1', function (princ_other_user) {
            PRINC_USER1 = princ_other_user;
            console.log('user1', princ_other_user);
        });
        Principal.lookupUser('a@a.com2', function (princ_other_user) {
            PRINC_USER2 = princ_other_user;
            console.log('user2', princ_other_user);
        });
        Principal.lookupUser('a@a.com3', function (princ_other_user) {
            PRINC_USER3 = princ_other_user;
            console.log('user3', princ_other_user);
        });

    },


    'click button.create_app_for_usr2': function (evnt) {

        Principal.create('application', Meteor.uuid(), Principal.user(), function (princ) {
            if (!princ) throw new Error('princ_app_404');

            PRINC_APP2 = princ;
            console.log(PRINC_APP2)

            var userId = Meteor.userId();
            Application.insert({stammdaten: userId, social: userId, p: princ._id});

            Principal.add_access(PRINC_APP2, PRINC_VAULT_STAMMDATEN, function (e, r) {
                console.log('access: app2 to PRINC_VAULT_STAMMDATEN', e, r)
            });
            Principal.add_access(PRINC_APP2, PRINC_VAULT_SOCIAL, function (e, r) {
                console.log('access: app2 to PRINC_VAULT_SOCIAL', e, r)
            });

        })
    },
    'click button.create_app_for_usr3': function (evnt) {

        Principal.create('application', Meteor.uuid(), Principal.user(), function (princ) {
            if (!princ) throw new Error('princ_app_404');

            PRINC_APP3 = princ;
            console.log(PRINC_APP3)

            var userId = Meteor.userId();
            Application.insert({stammdaten: userId, scoring: userId, p: princ._id});

            Principal.add_access(PRINC_APP3, PRINC_VAULT_STAMMDATEN, function (e, r) {
                console.log('access: app3 to PRINC_VAULT_STAMMDATEN', e, r)
            });
            Principal.add_access(PRINC_APP3, PRINC_VAULT_SCORING, function (e, r) {
                console.log('access: app3 to PRINC_VAULT_SCORING', e, r)
            });

        })
    },

    'click button.access_usr2': function (evnt) {
        Principal.add_access(PRINC_USER2, PRINC_APP2, function (e, r) {
            console.log('access: user2 to app2')
        });
    },
    'click button.access_usr3': function (evnt) {
        Principal.add_access(PRINC_USER3, PRINC_APP3, function (e, r) {
            console.log('access: user3 to app3')
        });
    },

    'click button.sub': function (evnt) {
        handle_stammdaten = Meteor.subscribe("Vault_stammdaten");
        handle_social = Meteor.subscribe("Vault_social");
        handle_scoring = Meteor.subscribe("Vault_scoring");
    },
    'click button.unsub': function (evnt) {
        handle_stammdaten.stop();
        handle_social.stop();
        handle_scoring.stop();
    },
    'click button.usr1': function (evnt) {
        CreateUser(1);
        LoginUser(1);
    },
    'click button.usr2': function (evnt) {
        CreateUser(2);
        LoginUser(2);
    },
    'click button.usr3': function (evnt) {
        CreateUser(3);
        LoginUser(3);
    }
})