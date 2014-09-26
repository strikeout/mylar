//Meteor.users._immutable({princ_user: [ '_id']});

function VaultFactory(type, encrypted_fields) {
    var name = 'Vault_' + type;
    var princtype = 'vault_' + type;

    var princ = {
        princ: 'p',
        princtype: princtype,
        auth: ['_id', 'owner']
    };
    var immutable = {
        'p': ['_id', 'owner']
    };

    var encs = {};
    _.each(encrypted_fields, function (field) {
        encs[field] = princ;
    })

    var collection = new Meteor.Collection(name);
    collection._encrypted_fields(encs);
    collection._immutable(immutable);

    if (Meteor.isServer) {
        Meteor.publish(name, function () {
            return collection.find({}, {fields: {}});
        });
    }

    return collection;
}


Vault_stammdaten = VaultFactory('stammdaten', ['name', 'sex']);
Vault_scoring = VaultFactory('scoring', ['schufa', 'demda']);
Vault_social = VaultFactory('social', ['fb', 'xing']);


var princ_user_immutable = {'p': [ '_id']};
var encrypt_with_princ_user = {
    princ: 'p',
    princtype: 'application',
    auth: ['_id']
}

Application = new Meteor.Collection('Application');
Application._encrypted_fields({
    'vault': encrypt_with_princ_user
});
Application._immutable(princ_user_immutable);


Meteor.startup(function () {
    // pub
    if (Meteor.isServer) {
        Meteor.publish("users", function () {
            return Meteor.users.find(this.userId, {fields: {}});
        });
        Meteor.publish("Application_all", function () {
            return Application.find();
        });
//        Meteor.publish("myVault", function () {
//            return Vault.find({owner: this.userId}, {fields: {}});
//        });
    }
    // sub
    if (Meteor.isClient) {
        Tracker.autorun(function () {
            Meteor.subscribe("users");
        })
        Tracker.autorun(function () {
            Meteor.subscribe("Application_all");
        })
//        Tracker.autorun(function () {
//            Meteor.subscribe("myVault");
//        })
    }
})

// ACL

var yes = function (userId, doc) {
    return true;
};
if (Meteor.isServer) {

    var allow_all = {
        insert: yes,
        update: yes,
        remove: yes
    }

    Meteor.users.allow(allow_all);
    Application.allow(allow_all);
    Vault_stammdaten.allow(allow_all);
    Vault_scoring.allow(allow_all);
    Vault_social.allow(allow_all);
}