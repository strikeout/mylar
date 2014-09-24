Package.describe({
  summary: "CProgress - Modified NProgress for Meteor, to show crypto actions and progress from mylar",
  version: "0.1.0",
  name: "cprogress"
});

Package.onUse(function (api) {
  api.use('jquery@1.0.0', 'client');
  api.add_files('lib/cprogress/cprogress.js', 'client');
  api.add_files('lib/cprogress/cprogress.css', 'client');
  api.add_files('lib/main.js', 'client');
  if (api.export){
    api.export('CProgress', 'client');
  }
});
