Package.describe({
  summary: "Provide security against active attacker"
});

Package.on_use(function(api) {
    api.add_files('active.js', ['client','server']);

    api.export("MYLAR_ACTIVE_ATTACKER");
});
