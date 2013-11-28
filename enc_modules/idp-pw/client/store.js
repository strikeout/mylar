var store_id = 0;

store_get = function (key) {
  Session.get(key);
  return amplify.store(key);
};

store_set = function (key, value) {
  Session.set(key, store_id++);
  amplify.store(key, value);
};
