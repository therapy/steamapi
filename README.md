# steamapi
basic steam api wrapper
## ""docs""

```js
create instance
const user = new steamUser();

login (handles steam guard for you)
await user.login(username, password);

edit the profile (id claiming)
await user.editProfile(id, name)

generate an api key with the current account
const key = await user.generateApiKey();
```
