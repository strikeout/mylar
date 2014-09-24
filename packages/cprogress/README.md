meteor-nprogress [![Build Status](https://travis-ci.org/zhouzhuojie/meteor-nprogress.svg?branch=master)](https://travis-ci.org/zhouzhuojie/meteor-nprogress)
================

NProgress for Meteor

Installation
```
meteor add mrt:nprogress
```

Basic usage
-------------

Simply call `start()` and `done()` to control the progress bar.

Note that NProgress needs to access DOM, so you may want to call NProgress when DOM is ready. In other words, call it
inside Meteor.startup or Template.foo.rendered function.

~~~ js
Meteor.startup(function(){
  NProgress.start();
  // Do something, like loading...
  NProgress.done();
});
~~~

More
-----------

Official Documentation for NProgress: [https://github.com/rstacruz/nprogress](https://github.com/rstacruz/nprogress)

Demo: [http://ricostacruz.com/nprogress/](http://ricostacruz.com/nprogress/)
