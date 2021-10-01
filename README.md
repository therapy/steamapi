# steamapi
basic steam api wrapper
## ""docs""

```js
// create instance
const user = new steamUser();

// login (handles steam guard for you)
await user.login(username, password);

// edit the profile (id claiming)
await user.editProfile(id, name)

// generate an api key with the current account
const key = await user.generateApiKey();

// set the apiKey manually (needed for getID())
user.setApiKey(apiKey);

// figure out the the current id linked to a profile
const id = await user.getID(id64);


user object properties /* (after logging in) */= {
  user.isLoggedIn // -> boolean
  user.steamid64 // -> string
  user.cookie // -> string
  user.sessionid // -> string
}
```
