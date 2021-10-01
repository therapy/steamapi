# steamapi
(almost) everything you need to swap / autoclaim / turbo

## dependencies
```
node-fetch
form-data
node-bignumber
```

## example
```js
const steamUser = require('./steamUser');

let username = "";
let password = "";

(async () => {
    const user = new steamUser();
    await user.login(username, password);
})();
```

`logged into ******** successfully`

## ""docs""
```js
// create instance
const user = new steamUser();

// login (handles steam guard for you)
await user.login(username, password);

// edit the profile (id claiming)
// login: required
await user.editProfile(id, name)

// generate an api key with the current account
// login: required
const key = await user.generateApiKey();

// set the apiKey manually (needed for getID())
user.setApiKey(apiKey);

// figure out the the current id linked to a profile
// apiKey: required
const id = await user.getID(id64);

// user object properties (some will be undefined if you are not logged in)
steamUser = {
  user.isLoggedIn // -> boolean
  user.steamid64 // -> string
  user.cookie // -> string
  user.sessionid // -> string
}
```
