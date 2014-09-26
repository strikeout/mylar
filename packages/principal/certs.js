/*
 Receives as input
 subject : Principal
 signer: id of signinig Principal
 signature
 verified
 */
Certificate = function (subject, signer, signature) {

    this.subject = subject; // Principal
    this.signer = signer; // Principal id
    this.signature = signature; // string
    this.verified = false;
};

/*
 This must have the following fields set:
 id, type, name, pk
 */
Certificate.prototype.store = function () {
    var self = this;
    Certs.insert({
        subject_id: self.subject._id,
        subject_type: self.subject.type,
        subject_name: self.subject.name,
        signer: self.signer,
        signature: self.signature
    });

};


Certificate.prototype.verify = function (on_complete) {
    var self = this;
    var msg = Certificate.contents(self.subject);
    var vk = self.signer.keys.verify;

    function verified(passed) {
        self.verified = passed;
        on_complete(self.verified);
    }

    crypto.verify(msg, self.signature, vk, verified);
};

//TODO: verify consistency public keys and id
Certificate.contents = function (princ) {
    return "(" + princ._id + ", " + princ.type + ", " + princ.name + ")";
};


all_certs = function () {
    var certs = Certs.find({}).fetch();
    var res = "";
    _.each(certs, function (doc) {
        res = res + "subject: " + doc["subject_id"] + " type " + doc["subject_type"] + " name " + doc["subject_name"] + " SIGNER: " + doc["signer"] + "\n";
    });
    return res;
}
