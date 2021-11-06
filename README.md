# steamapi

## dependencies
```
npm i
```

## example
put api.js in the same directory as your project
```js
const api = require("./api");

let username = "";
let password = "";

(async () => {
    const res = await api.login(username, password);
    console.log(res);
})();
```

```
{
  username: '*******',
  password: '*******',
  id64: '*****************',
  cookie: 'sessionid=************************; steamLoginSecure=***************************************************************;',
  sessionid: '************************'
}
```
